import { pool } from './db';

interface BannerSettings {
  enabled: boolean;
  text: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class SettingsCache {
  private bannerCache: CacheEntry<BannerSettings> | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.CACHE_TTL;
  }

  async getBannerSettings(): Promise<BannerSettings> {
    // Return cached data if valid
    if (this.bannerCache && !this.isExpired(this.bannerCache.timestamp)) {
      return this.bannerCache.data;
    }

    // Fetch from database
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT setting_key, setting_value
          FROM site_settings
          WHERE setting_key IN ('banner_enabled', 'banner_text')
        `);

        const settings: Record<string, string> = {};
        result.rows.forEach(row => {
          settings[row.setting_key] = row.setting_value;
        });

        const bannerSettings: BannerSettings = {
          enabled: settings.banner_enabled === 'true',
          text: settings.banner_text || '20% auf Stickerei bis 28.02.'
        };

        // Update cache
        this.bannerCache = {
          data: bannerSettings,
          timestamp: Date.now()
        };

        return bannerSettings;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error fetching banner settings:', error);
      // Return default settings on error
      return {
        enabled: true,
        text: '20% auf Stickerei bis 28.02.'
      };
    }
  }

  // Invalidate cache when settings are updated
  invalidateBannerCache(): void {
    this.bannerCache = null;
  }
}

// Export a singleton instance
export const settingsCache = new SettingsCache();
