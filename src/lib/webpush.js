import * as webpush from "web-push";

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT;

const isWebPushConfigured = Boolean(publicKey && privateKey && subject);

if (isWebPushConfigured) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export { isWebPushConfigured };
export default webpush;
