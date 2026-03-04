importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAwDRFKfH3K7KahtJMVvvM0HBxB4eKzYwc",
  authDomain: "messenger-chat-c605f.firebaseapp.com",
  projectId: "messenger-chat-c605f",
  messagingSenderId: "476706574952",
  appId: "1:476706574952:web:8620248a3e0520ce8621dd",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
  });
});