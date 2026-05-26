import assert from 'node:assert/strict';
import sinon from 'sinon';
import path from 'node:path';

const {sendAlertEmail} = require('../../../../../core/server/services/update-check/alert-email');
const EmailContentGenerator = require('../../../../../core/server/services/lib/email-content-generator');

const TEMPLATES_DIR = path.resolve(
    __dirname,
    '..', '..', '..', '..', '..',
    'core', 'server', 'services', 'mail', 'templates'
);

// Representative wire content covering everything the update-check service
// might realistically deliver: heading, paragraphs with inline emphasis, a
// list, links to release notes and docs, plus a couple of payloads we expect
// to be neutralised (script tag, on* handler, javascript: URL).
const FIXTURE_MESSAGE_HTML = `
    <h2>Ghost 6.50.0 is now available</h2>
    <p>This release includes a <strong>critical</strong> fix for an authentication issue. Please update <em>as soon as possible</em>.</p>
    <ul>
        <li><a href="https://github.com/TryGhost/Ghost/releases/tag/v6.50.0">Release notes</a></li>
        <li><a href="https://ghost.org/docs/update/">Upgrade guide</a></li>
    </ul>
    <p><a href="mailto:security@ghost.org">Contact security</a> if you have questions.</p>
    <script>alert('phish')</script>
    <p><a href="javascript:alert(1)" onclick="alert(1)">do not click</a></p>
`;

describe('sendAlertEmail', function () {
    let sendEmail: sinon.SinonStub;
    let generator: any;
    let generateEmailContent: any;

    beforeEach(function () {
        sendEmail = sinon.stub().resolves();
        generator = new EmailContentGenerator({
            getSiteUrl: () => 'https://example.com',
            getSiteTitle: () => 'Example',
            templatesDir: TEMPLATES_DIR
        });
        generateEmailContent = generator.getContent.bind(generator);
    });

    it('renders a realistic update message into the notification shell with safe anchors', async function () {
        await sendAlertEmail(
            {sendEmail, generateEmailContent},
            {
                to: 'owner@example.com',
                messageHtml: FIXTURE_MESSAGE_HTML,
                siteUrl: 'https://example.com'
            }
        );

        sinon.assert.calledOnce(sendEmail);
        const sent = sendEmail.firstCall.args[0];

        assert.equal(sent.to, 'owner@example.com');
        assert.equal(sent.subject, 'Ghost notification from https://example.com');
        assert.equal(sent.forceTextContent, undefined);

        const html: string = sent.html;
        assert.match(html, /<!doctype html/i, 'wraps content in the Ghost shell');
        assert.match(html, /Ghost 6\.50\.0 is now available/, 'preserves headings');
        assert.match(html, /<strong>critical<\/strong>/, 'preserves inline emphasis');
        assert.match(html, /Release notes/, 'preserves anchor text');
        assert.match(html, /href="https:\/\/github\.com\/TryGhost\/Ghost\/releases\/tag\/v6\.50\.0"/);
        assert.match(html, /href="mailto:security@ghost\.org"/);
        assert.match(html, /target="_blank"/, 'forces anchor target');
        assert.match(html, /rel="noopener noreferrer"/, 'forces anchor rel');

        assert.doesNotMatch(html, /<script/i, 'strips script tags');
        assert.doesNotMatch(html, /onclick=/, 'strips inline event handlers');
        assert.doesNotMatch(html, /javascript:/i, 'strips javascript: URLs');
    });
});
