import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db';
import { settingsCache } from '../../../lib/settings-cache';

// GET - Get banner settings (uses cache)
export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;

  if (!user?.isAdmin) {
    return new Response(JSON.stringify({ success: false, error: { message: 'Unauthorized' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const settings = await settingsCache.getBannerSettings();

    return new Response(JSON.stringify({
      success: true,
      data: settings
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching banner settings:', error);
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Failed to fetch banner settings' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST - Update banner settings
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;

  if (!user?.isAdmin) {
    return new Response(JSON.stringify({ success: false, error: { message: 'Unauthorized' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const data = await request.json();
    const { enabled, text } = data;

    // Validation
    if (typeof enabled !== 'boolean') {
      return new Response(JSON.stringify({
        success: false,
        error: { message: 'Enabled must be a boolean' }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!text || !text.trim()) {
      return new Response(JSON.stringify({
        success: false,
        error: { message: 'Banner text is required' }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const client = await pool.connect();
    try {
      // Update or insert banner_enabled
      await client.query(`
        INSERT INTO site_settings (setting_key, setting_value, updated_at)
        VALUES ('banner_enabled', $1, CURRENT_TIMESTAMP)
        ON CONFLICT (setting_key)
        DO UPDATE SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
      `, [enabled.toString()]);

      // Update or insert banner_text
      await client.query(`
        INSERT INTO site_settings (setting_key, setting_value, updated_at)
        VALUES ('banner_text', $1, CURRENT_TIMESTAMP)
        ON CONFLICT (setting_key)
        DO UPDATE SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
      `, [text.trim()]);

      // Invalidate cache so changes appear immediately
      settingsCache.invalidateBannerCache();

      return new Response(JSON.stringify({
        success: true,
        data: { enabled, text: text.trim() }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating banner settings:', error);
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Failed to update banner settings' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
