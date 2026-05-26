import errors from '@tryghost/errors';
import {sanitizeNotificationHtml} from './sanitize-notification-html';

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

type SendEmail = (options: SendEmailOptions) => Promise<unknown>;

interface RenderedTemplate {
    html: string;
    text?: string;
}

type GenerateEmailContent = (options: {
    template: string;
    data: Record<string, unknown>;
}) => Promise<RenderedTemplate>;

export interface AlertEmailDeps {
    sendEmail: SendEmail;
    generateEmailContent: GenerateEmailContent;
}

export interface AlertEmailInput {
    to: string;
    messageHtml: string;
    siteUrl: string;
}

const TEMPLATE_NAME = 'notification';

export async function sendAlertEmail(
    deps: AlertEmailDeps,
    input: AlertEmailInput
): Promise<void> {
    if (typeof deps.generateEmailContent !== 'function') {
        throw new errors.IncorrectUsageError({
            message: 'sendAlertEmail requires generateEmailContent'
        });
    }

    const safeMessage = sanitizeNotificationHtml(input.messageHtml);
    const {html, text} = await deps.generateEmailContent({
        template: TEMPLATE_NAME,
        data: {
            message: safeMessage,
            siteUrl: input.siteUrl,
            recipientEmail: input.to
        }
    });

    await deps.sendEmail({
        to: input.to,
        subject: `Ghost notification from ${input.siteUrl}`,
        html,
        ...(text ? {text} : {})
    });
}
