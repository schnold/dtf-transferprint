import type { APIRoute } from 'astro';
import { getFormRequestById, createFormRequestResponse, getEmailTemplates } from '../../../../../lib/db';
import { sendEmail } from '../../../../../lib/email';
import { generateFormRequestResponseEmail, replaceTemplateVariables } from '../../../../../lib/email-templates/form-request-emails';

export const prerender = false;

export const POST: APIRoute = async ({ locals, params, request }) => {
  try {
    // Check admin authorization
    const user = locals.user;
    if (!user?.isAdmin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Unauthorized - Admin access required' },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const requestId = params.id;
    if (!requestId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Request ID is required' },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { subject, message, templateId, isInternalNote } = body;

    // Validate required fields
    if (!message) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Message is required' },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the original request
    const requestData = await getFormRequestById(requestId);
    if (!requestData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Request not found' },
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { request: formRequest } = requestData;

    let finalSubject = subject;
    let finalMessage = message;
    let templateName: string | undefined;

    // If template ID is provided, load and apply template
    if (templateId) {
      const templates = await getEmailTemplates({ isActive: true });
      const template = templates.find((t) => t.id === templateId);

      if (template) {
        templateName = template.name;
        // Template variables are already replaced in the message on the frontend
        // But we can use the template subject if no custom subject provided
        if (!finalSubject) {
          finalSubject = template.subject;
        }
      }
    }

    // Ensure subject is set
    if (!finalSubject && !isInternalNote) {
      finalSubject = `Re: ${formRequest.subject}`;
    }

    // Send email if not an internal note
    if (!isInternalNote) {
      const emailContent = generateFormRequestResponseEmail({
        userName: formRequest.name,
        userEmail: formRequest.email,
        requestSubject: formRequest.subject,
        requestMessage: formRequest.message,
        responseMessage: finalMessage,
        adminName: user.name || 'DTF Transfer Print Team',
      });

      await sendEmail({
        to: formRequest.email,
        subject: finalSubject || `Re: ${formRequest.subject}`,
        html: emailContent.html,
        text: emailContent.text,
      });
    }

    // Save response to database
    const response = await createFormRequestResponse({
      formRequestId: requestId,
      responseType: isInternalNote ? 'note' : 'email',
      subject: finalSubject,
      message: finalMessage,
      templateName,
      sentToEmail: isInternalNote ? undefined : formRequest.email,
      isInternalNote: isInternalNote || false,
      createdByUserId: user.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: response,
        message: isInternalNote ? 'Internal note saved successfully' : 'Email sent successfully',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending response:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { message: 'Failed to send response' },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
