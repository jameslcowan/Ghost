import sanitizeHtml from 'sanitize-html';

// Even though the upstream feed is operated by Ghost org, the resulting HTML
// is rendered into admin inboxes on the receiving install. A compromised or
// malformed feed entry must not be able to ship scripts, event handlers, or
// non-http(s) URLs to recipients via this path.
const NOTIFICATION_ALLOWED_TAGS = [
    'p', 'br', 'hr',
    'strong', 'b', 'em', 'i', 'u', 'code',
    'a',
    'ul', 'ol', 'li',
    'blockquote',
    'h1', 'h2', 'h3', 'h4'
];

const NOTIFICATION_ALLOWED_SCHEMES = ['http', 'https', 'mailto'];

// `target="_blank"` + `rel="noopener noreferrer"` are forced on every anchor
// so any rendered link opens in a fresh context with no back-channel to the
// email client.
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
    allowedTags: NOTIFICATION_ALLOWED_TAGS,
    allowedAttributes: {
        a: ['href', 'title', 'target', 'rel']
    },
    allowedSchemes: NOTIFICATION_ALLOWED_SCHEMES,
    allowProtocolRelative: false,
    transformTags: {
        a: sanitizeHtml.simpleTransform('a', {
            target: '_blank',
            rel: 'noopener noreferrer'
        })
    }
};

export function sanitizeNotificationHtml(html: unknown): string {
    if (typeof html !== 'string') {
        return '';
    }
    return sanitizeHtml(html, SANITIZE_OPTIONS);
}

export {NOTIFICATION_ALLOWED_TAGS, NOTIFICATION_ALLOWED_SCHEMES};
