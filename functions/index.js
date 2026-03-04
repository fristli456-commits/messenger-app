const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.sendPushOnMessage = functions.database
  .ref("chats/{chatId}/messages/{messageId}")
  .onCreate(async (snapshot, context) => {
    const message = snapshot.val();
    if (!message) return null;

    const senderId = message.senderId;
    const chatId = context.params.chatId;

    const tokensSnap = await admin.database().ref("pushTokens").once("value");
    const tokens = tokensSnap.val();

    if (!tokens) return null;

    const notifications = [];

    for (const uid in tokens) {
      if (uid !== senderId) {
        notifications.push({
          token: tokens[uid],
          notification: {
            title: message.senderName || "Новое сообщение",
            body: message.text || "Аудиосообщение",
          },
          data: {
            chatId: chatId,
          },
        });
      }
    }

    return Promise.all(
      notifications.map((notif) =>
        admin.messaging().send(notif)
      )
    );
  });