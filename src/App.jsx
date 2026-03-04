import { useState, useEffect, useRef } from "react";
import { db, auth } from "./firebase";
import { storage } from "./firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import ChatSwitcher from "./components/ChatSwitcher"
import {
  ref,
  push,
  set,
  update,
  remove,
  onValue,
  onDisconnect,
} from "firebase/database";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import "./App.css";
import { PushNotifications } from '@capacitor/push-notifications';

/* ===========================
   Helpers
=========================== */

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ===========================
   App
=========================== */
function AudioMessage({ url, isMine }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = () => {
    if (!audioRef.current) return;

    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    setProgress((a.currentTime / a.duration) * 100);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginTop: 6,
        padding: 8,
        background: isMine ? "#6f5df5" : "#2a2a3d",
        borderRadius: 18,
        width: 220,
      }}
    >
      <button
        onClick={toggle}
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "none",
          background: "white",
          cursor: "pointer",
        }}
      >
        {playing ? "⏸" : "▶"}
      </button>

      <div
        style={{
          flex: 1,
          height: 4,
          background: "#555",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: progress + "%",
            height: "100%",
            background: "white",
          }}
        />
      </div>

      <audio
        ref={audioRef}
        src={url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={onTimeUpdate}
      />
    </div>
  );
}
export default function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
  const savedName = localStorage.getItem("chatUsername");
  if (savedName) {
    setCurrentUser(savedName);
  }
}, []);

useEffect(() => {
  if ("Notification" in window) {
    Notification.requestPermission();
  }
}, []);

useEffect(() => {
  async function checkVersion() {
    try {
      const res = await fetch("https://push-server-zwzf.onrender.com/version.json?nocache=" + Date.now());
      const data = await res.json();

      const localVersion = localStorage.getItem("app_version") || "0";

if (localVersion !== data.version) {
  setUpdateAvailable(true);
}

    } catch (e) {
      console.log("version check failed");
    }
  }

  checkVersion();

  const interval = setInterval(checkVersion, 60000);

  return () => clearInterval(interval);
}, []);

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      initPush();
    }
  });

  return () => unsubscribe();
}, []);

async function initPush() {
  try {
    const perm = await PushNotifications.requestPermissions();

    if (perm.receive !== "granted") {
      console.log("Push permission denied");
      return;
    }

    await PushNotifications.register();

    // ✅ Токен
    PushNotifications.addListener("registration", (token) => {
      console.log("FCM token:", token.value);

      if (auth.currentUser) {
        set(
          ref(db, "pushTokens/" + auth.currentUser.uid),
          token.value
        );
      }
    });

    // ✅ Когда push пришёл (foreground)
    PushNotifications.addListener(
      "pushNotificationReceived",
      (notification) => {
        console.log("Push received:", notification);
      }
    );

    // ✅ Когда нажали на push
    PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (notification) => {
        console.log("Push clicked:", notification);

        // пример перехода в чат
        const chatId = notification.notification.data?.chatId;
        if (chatId) {
          setActiveChatId(chatId);
        }
      }
    );

  } catch (err) {
    console.error("Push init error:", err);
  }
}

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(true);
  const [otherStatus, setOtherStatus] = useState(null);
  const [otherUserName, setOtherUserName] = useState(null);

  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const [pinnedMessage, setPinnedMessage] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [activeChatId, setActiveChatId] = useState(null)
  const [chatList, setChatList] = useState([])
  const [otherUid, setOtherUid] = useState(null);
  const [otherToken, setOtherToken] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  // === SEARCH ===
const [searchMode, setSearchMode] = useState(false);
const [searchQuery, setSearchQuery] = useState("");
const [foundMessages, setFoundMessages] = useState([]);
const [currentFoundIndex, setCurrentFoundIndex] = useState(0);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const longPressTimer = useRef(null);
  // === SWIPE ===
const swipeStartX = useRef(0);
const swipeActiveId = useRef(null);
const mouseDragging = useRef(false);

const handleMouseDown = (e, msg) => {
  mouseDragging.current = true;
  swipeStartX.current = e.clientX;
  swipeActiveId.current = msg.id;
};

const handleMouseMove = (e, msg) => {
  if (!mouseDragging.current) return;
  if (swipeActiveId.current !== msg.id) return;

  const delta = e.clientX - swipeStartX.current;

  if (delta > 0 && delta < 120) {
    const el = document.getElementById("msg-" + msg.id);
    if (el) el.style.transform = `translateX(${delta}px)`;
  }
};

const handleMouseUp = (msg) => {
  if (!mouseDragging.current) return;

  const el = document.getElementById("msg-" + msg.id);
  if (!el) return;

  const matrix = new WebKitCSSMatrix(
    window.getComputedStyle(el).transform
  );

  const movedX = matrix.m41;

  if (movedX > 70) {
    setReplyTo(msg);
  }

  el.style.transition = "0.2s ease";
  el.style.transform = "translateX(0px)";

  mouseDragging.current = false;
  swipeActiveId.current = null;
};

  /* ===========================
     AUTH
  =========================== */

  /* ===========================
     ONLINE / OFFLINE
  =========================== */

  useEffect(() => {
  if (!auth.currentUser) return;

  const uid = auth.currentUser.uid;
  const userStatusRef = ref(db, "status/" + uid);
  const connectedRef = ref(db, ".info/connected");

  const unsubscribe = onValue(connectedRef, (snap) => {
    if (snap.val() === false) return;

    set(userStatusRef, {
      online: true,
      lastSeen: Date.now(),
      name: currentUser,
    });

    onDisconnect(userStatusRef).set({
      online: false,
      lastSeen: Date.now(),
      name: currentUser,
    });
  });

  return () => unsubscribe();
}, [currentUser]);

  /* ===========================
     OTHER USER STATUS
  =========================== */

  useEffect(() => {
  const statusRef = ref(db, "status");

  const unsub = onValue(statusRef, (snapshot) => {
    const data = snapshot.val();
    if (!data || !auth.currentUser) return;

    const other = Object.entries(data).find(
      ([uid]) => uid !== auth.currentUser.uid
    );

    if (other) {
      setOtherStatus(other[1]);
      setOtherUserName(other[1].name || "Собеседник");
      setOtherUid(other[0]);
    }
  });

  return () => unsub();
}, [auth.currentUser]);

useEffect(() => {
  if (!otherUid) return;

  const tokenRef = ref(db, "pushTokens/" + otherUid);

  const unsub = onValue(tokenRef, (snap) => {
    if (snap.exists()) {
      setOtherToken(snap.val());
    }
  });

  return () => unsub();
}, [otherUid]);


  /* ===========================
     MESSAGES
  =========================== */

  useEffect(() => {
  if (!activeChatId) return;

  const messagesRef = ref(
    db,
    "chats/" + activeChatId + "/messages"
  );

  const unsub = onValue(messagesRef, (snapshot) => {
    const data = snapshot.val();

    if (data) {
      const list = Object.values(data).sort(
        (a, b) => a.ts - b.ts
      );

      setMessages(list);

      const last = list[list.length - 1];

if (
  last &&
  last.senderId !== auth.currentUser.uid &&
  document.hidden
) {
  if (Notification.permission === "granted") {
    new Notification("Новое сообщение", {
      body: last.text || "Файл",
    });
  }
}

      const pinned = list.find((m) => m.pinned);
      setPinnedMessage(pinned || null);
    } else {
      setMessages([]);
    }

    setLoading(false);
  });

  return () => unsub();
}, [activeChatId]);
/* ===========================
   READ RECEIPTS
=========================== */

useEffect(() => {
  if (!auth.currentUser || !activeChatId) return;

  messages.forEach((msg) => {
    if (
      msg.senderId !== auth.currentUser.uid &&
      !msg.readBy?.[auth.currentUser.uid]
    ) {
      update(
        ref(
          db,
          "chats/" + activeChatId + "/messages/" + msg.id + "/readBy"
        ),
        { [auth.currentUser.uid]: true }
      );
    }
  });
}, [messages, activeChatId]);

  /* ===========================
     TYPING
  =========================== */

  function sendTyping() {
  if (!auth.currentUser || !activeChatId) return;

    const typingRef = ref(
  db,
  "typing/" + activeChatId + "/" + auth.currentUser.uid
);

    set(typingRef, {
      name: currentUser,
      ts: Date.now(),
    });

    if (typingTimeoutRef.current)
      clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      remove(typingRef);
    }, 2000);
  }

  useEffect(() => {
  if (!activeChatId) return;

  const typingRef = ref(db, "typing/" + activeChatId);

    const unsub = onValue(typingRef, (snapshot) => {
      const data = snapshot.val();
      if (!data || !auth.currentUser) {
        setTypingUsers({});
        return;
      }

      const filtered = Object.entries(data)
        .filter(([uid]) => uid !== auth.currentUser.uid)
        .reduce((acc, [uid, val]) => {
          acc[uid] = val;
          return acc;
        }, {});

      setTypingUsers(filtered);
    });

    return () => unsub();
  }, [activeChatId]);
  /* ===========================
   SWIPE
=========================== */

const handleTouchStart = (e, msg) => {
  swipeStartX.current = e.touches[0].clientX;
  swipeActiveId.current = msg.id;
};

const handleTouchMove = (e, msg) => {
  if (swipeActiveId.current !== msg.id) return;

  const delta = e.touches[0].clientX - swipeStartX.current;

  if (delta > 0 && delta < 120) {
    const el = document.getElementById("msg-" + msg.id);
    if (el) el.style.transform = `translateX(${delta}px)`;
  }
};

const handleTouchEnd = (msg) => {
  const el = document.getElementById("msg-" + msg.id);
  if (!el) return;

  const matrix = new WebKitCSSMatrix(
    window.getComputedStyle(el).transform
  );

  const movedX = matrix.m41;

  if (movedX > 70) {
    setReplyTo(msg);
    if (navigator.vibrate) navigator.vibrate(30);
  }

  el.style.transition = "0.2s ease";
  el.style.transform = "translateX(0px)";
  swipeActiveId.current = null;
};

  /* ===========================
     LONG PRESS
  =========================== */

  const handlePressStart = (msg) => {
    longPressTimer.current = setTimeout(() => {
      setSelectedMessage(msg);
    }, 450);
  };

  const handlePressEnd = () => {
    clearTimeout(longPressTimer.current);
  };
  
  /* ===========================
   SEARCH LOGIC
=========================== */

useEffect(() => {
  if (!searchQuery.trim()) {
    setFoundMessages([]);
    return;
  }

  const lower = searchQuery.toLowerCase();

  const results = messages.filter((m) =>
    m.text?.toLowerCase().includes(lower)
  );

  setFoundMessages(results);
  setCurrentFoundIndex(0);
}, [searchQuery, messages]);

useEffect(() => {
  if (foundMessages.length === 0) return;

  const msg = foundMessages[currentFoundIndex];
  if (!msg) return;

  const el = document.getElementById("msg-" + msg.id);
  if (!el) return;

  el.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}, [currentFoundIndex, foundMessages]);

useEffect(() => {
  if (!auth.currentUser) return;

  const chatListRef = ref(db, "chatList");

  const unsub = onValue(chatListRef, (snapshot) => {
    const data = snapshot.val();

    if (!data) {
      setChatList([]);
      setActiveChatId(null);
      return;
    }

    const chats = Object.entries(data)
      .filter(([id, chat]) =>
        chat.members?.[auth.currentUser.uid]
      )
      .map(([id, chat]) => ({
        id,
        ...chat
      }));

    setChatList(chats);

    // ЕСЛИ текущий чат не существует — выбрать первый
    if (
      chats.length > 0 &&
      !chats.find(c => c.id === activeChatId)
    ) {
      setActiveChatId(chats[0].id);
    }
  });

  return () => unsub();
}, [auth.currentUser, activeChatId]);

  /* ===========================
     AUTO SCROLL
  =========================== */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ===========================
   SCROLL TO PINNED
=========================== */

function scrollToMessage(messageId) {
  const el = document.getElementById("msg-" + messageId);
  if (!el) return;

  el.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  el.style.transition = "0.3s";
  el.style.boxShadow = "0 0 0 2px #7C6AF5";

  setTimeout(() => {
    el.style.boxShadow = "none";
  }, 1200);
}

  function createChat() {
  if (!auth.currentUser || !otherUid) return;

  const newChatRef = push(ref(db, "chatList"));
  const chatId = newChatRef.key;

  set(newChatRef, {
    members: {
      [auth.currentUser.uid]: true,
      [otherUid]: true,
    },
    createdAt: Date.now(),
  });

  set(ref(db, "chats/" + chatId), {
    createdAt: Date.now(),
  });

  setActiveChatId(chatId);
}

function deleteChat(chatId) {
  remove(ref(db, "chatList/" + chatId));
  remove(ref(db, "chats/" + chatId));
  remove(ref(db, "typing/" + chatId));

  if (activeChatId === chatId) {
    setActiveChatId(null);
  }
}

function deleteForEveryone(msg) {
  remove(
    ref(db, "chats/" + activeChatId + "/messages/" + msg.id)
  );
  setSelectedMessage(null);
}

function deleteForMe(msg) {
  set(
    ref(
      db,
      "chats/" +
        activeChatId +
        "/messages/" +
        msg.id +
        "/deletedFor/" +
        auth.currentUser.uid
    ),
    true
  );
  setSelectedMessage(null);
}

function pinMessage(msg) {
  // сначала убираем старое закрепление
  messages.forEach((m) => {
    if (m.pinned) {
      update(
        ref(
          db,
          "chats/" +
            activeChatId +
            "/messages/" +
            m.id
        ),
        { pinned: false }
      );
    }
  });

  update(
    ref(
      db,
      "chats/" +
        activeChatId +
        "/messages/" +
        msg.id
    ),
    { pinned: true }
  );

  setSelectedMessage(null);
}

function toggleSelect(msg) {
  setSelectedIds((prev) =>
    prev.includes(msg.id)
      ? prev.filter((id) => id !== msg.id)
      : [...prev, msg.id]
  );
}

function deleteSelected() {
  selectedIds.forEach((id) => {
    remove(
      ref(
        db,
        "chats/" + activeChatId + "/messages/" + id
      )
    );
  });

  setSelectedIds([]);
  setSelectionMode(false);
}

  /* ===========================
     MESSAGE ACTIONS
  =========================== */

  function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  setPendingFile(file);
  e.target.value = "";
}

function handlePaste(e) {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (item.kind === "file") {
      const file = item.getAsFile();
      if (!file) continue;

      if (
        file.type.startsWith("image") ||
        file.type.startsWith("video")
      ) {
        setPendingFile(file);
        e.preventDefault();
        return;
      }
    }
  }
}
  async function sendMessage() {
  if (!auth.currentUser || !activeChatId) return;

  // ===== ЕСЛИ ЕСТЬ ФАЙЛ =====
  if (pendingFile) {
    const formData = new FormData();
    formData.append("file", pendingFile);
    formData.append("upload_preset", "chat_uploads");
    formData.append("resource_type", "raw");

    try {
      const response = await fetch(
        "https://api.cloudinary.com/v1_1/dcvxefsoe/raw/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!data.secure_url) {
        console.error("Cloudinary error:", data);
        return;
      }

      const messageRef = push(
        ref(db, "chats/" + activeChatId + "/messages")
      );

      // 🔥 ВАЖНО — fileType объявляется ЗДЕСЬ
      let fileType = "file";

if (pendingFile.type.startsWith("image")) {
  fileType = "image";
} else if (pendingFile.type.startsWith("video")) {
  fileType = "video";
} else if (pendingFile.type.startsWith("audio")) {
  fileType = "audio";
}

      await set(messageRef, {
        id: messageRef.key,
        type: fileType,
        fileName: pendingFile.name,
        fileUrl: data.secure_url,
        text: input.trim() || "",
        senderId: auth.currentUser.uid,
        senderName: currentUser,
        ts: Date.now(),
        edited: false,
        replyTo: replyTo
          ? {
              id: replyTo.id,
              text: replyTo.text,
              senderName: replyTo.senderName,
            }
          : null,
        pinned: false,
        deletedFor: {},
        readBy: {
          [auth.currentUser.uid]: true,
        },
      });

      if (otherToken) {
  fetch("https://push-server-zwzf.onrender.com/sendPush", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: otherToken,
      title: currentUser,
      body: input || "Аудиосообщение",
      chatId: activeChatId
    })
  }).catch(err => console.log("Push error", err));
}

      setPendingFile(null);
      setInput("");
      setReplyTo(null);
      return;
    } catch (err) {
      console.error("Upload error:", err);
      return;
    }
  }

  // ===== ОБЫЧНЫЙ ТЕКСТ =====
  if (!input.trim()) return;

  const messageRef = push(
    ref(db, "chats/" + activeChatId + "/messages")
  );

  await set(messageRef, {
    id: messageRef.key,
    text: input.trim(),
    senderId: auth.currentUser.uid,
    senderName: currentUser,
    ts: Date.now(),
    edited: false,
    replyTo: replyTo
      ? {
          id: replyTo.id,
          text: replyTo.text,
          senderName: replyTo.senderName,
        }
      : null,
    pinned: false,
    deletedFor: {},
    readBy: {
      [auth.currentUser.uid]: true,
    },
  });

  if (otherToken) {
  fetch("https://push-server-zwzf.onrender.com/sendPush", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: otherToken,
      title: currentUser,
      body: input || "Аудиосообщение",
      chatId: activeChatId
    })
  }).catch(err => console.log("Push error", err));
}

  setInput("");
  setReplyTo(null);
}
  /* ===========================
     LOGIN
  =========================== */

  async function handleLogin(e) {
  e.preventDefault();

  if (!username.trim() || !password.trim()) return;

  try {
    const email = username.trim().toLowerCase() + "@chat.com";

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    localStorage.setItem("chatUsername", username);
    setCurrentUser(username);
    setLoginError("");
  } catch (err) {
    setLoginError("Неверное имя или пароль");
  }
}

  if (!currentUser) {
    return (
      <div style={styles.loginWrapper}>
        <form onSubmit={handleLogin} style={styles.loginBox}>
          <h2 style={{ color: "#fff" }}>Онлайн чат</h2>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Ваше имя"
            style={styles.input}
          />
          
          <input
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  placeholder="Пароль"
  style={styles.input}
/>

{loginError && (
  <div style={{ color: "red", marginTop: 10 }}>
    {loginError}
  </div>
)}

          <button style={styles.button}>Войти</button>
        </form>
      </div>
    );
  }

  /* ===========================
     UI
  =========================== */

  return (
  <div style={{ display: "flex", height: "100vh" }}>
    
    <ChatSwitcher
  chats={chatList}
  activeChat={activeChatId}
  setActiveChat={setActiveChatId}
  createChat={createChat}
  deleteChat={deleteChat}
/>
    <div style={styles.app}>
      <div style={styles.header}>
      {updateAvailable && (
  <button
    onClick={() => {
      localStorage.setItem("app_version", Date.now());
      window.open("https://push-server-zwzf.onrender.com/app.apk");
    }}
    style={{
      background: "#ff9800",
      border: "none",
      padding: "6px 10px",
      borderRadius: 6,
      cursor: "pointer",
      color: "white",
      marginRight: 10
    }}
  >
    🔄 Обновить
  </button>
)}
  {searchMode ? (
    <>
      <button
        onClick={() => {
          setSearchMode(false);
          setSearchQuery("");
        }}
        style={{
          background: "transparent",
          border: "none",
          color: "#fff",
          fontSize: 18,
          cursor: "pointer",
        }}
      >
        ←
      </button>

      <input
        autoFocus
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Поиск..."
        style={{
          flex: 1,
          padding: 6,
          borderRadius: 6,
          border: "none",
        }}
      />

      <span style={{ fontSize: 12 }}>
        {foundMessages.length > 0
          ? `${currentFoundIndex + 1}/${foundMessages.length}`
          : "0/0"}
      </span>

      <button
        onClick={() =>
          setCurrentFoundIndex((prev) =>
            prev > 0 ? prev - 1 : foundMessages.length - 1
          )
        }
      >
        ↑
      </button>

      <button
        onClick={() =>
          setCurrentFoundIndex((prev) =>
            prev < foundMessages.length - 1 ? prev + 1 : 0
          )
        }
      >
        ↓
      </button>
    </>
  ) : (
    <>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>
          {otherUserName || "Собеседник"}
        </div>

        {otherStatus?.online ? (
          <div className="online-status">
            <span className="online-dot"></span>
            в сети
          </div>
        ) : otherStatus ? (
          <div style={styles.statusText}>
            был(а) {formatTime(otherStatus.lastSeen)}
          </div>
        ) : (
          <div style={styles.statusText}>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() => setSearchMode(true)}
          style={{
            background: "transparent",
            border: "none",
            color: "#aaa",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          🔍
        </button>

        <button
          onClick={async () => {
  await signOut(auth);
  localStorage.removeItem("chatUsername");
  setCurrentUser(null);
}}
          style={{
            background: "transparent",
            border: "none",
            color: "#aaa",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          выйти
        </button>
      </div>
    </>
  )}
</div>

{selectionMode && (
  <div
    style={{
      display: "flex",
      gap: 10,
      padding: "10px 15px",
      background: "#1a1a28",
      alignItems: "center",
    }}
  >
    <button
      onClick={deleteSelected}
      style={{
        background: "#7C6AF5",
        border: "none",
        color: "white",
        padding: "6px 12px",
        borderRadius: 6,
        cursor: "pointer",
      }}
    >
      🗑 Удалить ({selectedIds.length})
    </button>

    <button
  onClick={() => {
    const texts = messages
  .filter(m => selectedIds.includes(m.id))
  .sort((a, b) => a.ts - b.ts) // порядок как в чате
  .map(m => (m.text || "").trim())
  .filter(t => t.length > 0)
  .join("\n");

navigator.clipboard.writeText(texts);

    setSelectionMode(false);
    setSelectedIds([]);
  }}
  style={{
    background: "#4CAF50",
    border: "none",
    color: "white",
    padding: "6px 12px",
    borderRadius: 6,
    cursor: "pointer",
  }}
>
  📋 Копировать ({selectedIds.length})
</button>

    <button
      onClick={() => {
        setSelectionMode(false);
        setSelectedIds([]);
      }}
      style={{
        background: "transparent",
        border: "1px solid #444",
        color: "#aaa",
        padding: "6px 12px",
        borderRadius: 6,
        cursor: "pointer",
      }}
    >
      Отмена
    </button>
  </div>
)}

      {pinnedMessage && (
  <div
    style={styles.pinned}
    onClick={() => scrollToMessage(pinnedMessage.id)}
  >
    📌 {pinnedMessage.text}
  </div>
)}

      <div style={styles.messages}>
        {loading && <div>Подключение...</div>}

        {messages
          .filter(
            (m) =>
              !m.deletedFor?.[auth.currentUser.uid]
          )
          .map((msg) => {
            const isMine =
              msg.senderId === auth.currentUser.uid;

            return (
              <div
  key={msg.id}
  id={"msg-" + msg.id}
  className="message-row-animated"

  onMouseDown={(e) => {
    handleMouseDown(e, msg);   // свайп ПК
    handlePressStart(msg);     // long press
  }}

  onMouseMove={(e) => handleMouseMove(e, msg)}

  onMouseUp={() => {
    handleMouseUp(msg);        // завершение свайпа
    handlePressEnd();          // завершение long press
  }}

  onMouseLeave={() => {
    handlePressEnd();
  }}

  onClick={() => {
    if (selectionMode) toggleSelect(msg);
  }}

  onTouchStart={(e) => {
    handlePressStart(msg);
    handleTouchStart(e, msg);
  }}

  onTouchMove={(e) => handleTouchMove(e, msg)}

  onTouchEnd={() => {
    handlePressEnd();
    handleTouchEnd(msg);
  }}
>
                <div
                  style={{
                    ...styles.bubble,
                    background:
  highlightedId === msg.id
    ? "#9c88ff"
    : selectedIds.includes(msg.id)
    ? "#4b3fa5"
    : isMine
    ? "#7C6AF5"
    : "#23233a",
                    transform:
                      selectedMessage?.id === msg.id
                        ? "scale(0.96)"
                        : "scale(1)",
                    transition: "0.15s",
                  }}
                >
                  {!isMine && (
                    <div style={styles.senderName}>
                      {msg.senderName}
                    </div>
                  )}

                  {msg.replyTo && (
  <div
    style={styles.replyBlock}
    onClick={() => {
      const el = document.getElementById("msg-" + msg.replyTo.id);
      if (!el) return;

      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      setHighlightedId(msg.replyTo.id);

      setTimeout(() => {
        setHighlightedId(null);
      }, 2000);
    }}
  >
    ↩ {msg.replyTo.senderName}: {msg.replyTo.text}
  </div>
)}

                  {/* ЕСЛИ ЭТО ФОТО */}
{msg.type === "image" && (
  <>
    <img
      src={msg.fileUrl}
      style={{
        maxWidth: 220,
        borderRadius: 10,
        marginTop: 6,
        cursor: "pointer"
      }}
      onClick={() => setFullscreenImage(msg.fileUrl)}
    />

    {msg.text && (
      <div style={{ marginTop: 6 }}>
        {msg.text}
      </div>
    )}
  </>
)}
{/* ЕСЛИ ЭТО ВИДЕО */}
{msg.type === "video" && (
  <>
    <video
      src={msg.fileUrl}
      controls
      style={{
        maxWidth: 240,
        borderRadius: 10,
        marginTop: 6
      }}
    />
  </>
)}

{msg.type === "audio" && (
  <AudioMessage url={msg.fileUrl} isMine={isMine} />
)}
{/* ЕСЛИ ЭТО ФАЙЛ */}
{msg.type === "file" && (
  <div
    style={{
      marginTop: 6,
      padding: 10,
      background: "#2a2a3d",
      borderRadius: 8,
      cursor: "pointer"
    }}
    onClick={() => window.open(msg.fileUrl, "_blank")}
  >
    📎 {msg.fileName || "Файл"}
  </div>
)}

{msg.text && (
  searchQuery &&
  msg.text.toLowerCase().includes(searchQuery.toLowerCase()) ? (
    msg.text
      .split(
        new RegExp(
          `(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
          "gi"
        )
      )
      .map((part, i) =>
        part.toLowerCase() === searchQuery.toLowerCase() ? (
          <span
            key={i}
            style={{ background: "#ffd54f", color: "#000" }}
          >
            {part}
          </span>
        ) : (
          part
        )
      )
  ) : (
    <div
  style={{
    marginTop: msg.type ? 6 : 0,
    whiteSpace: "pre-wrap"
  }}
>
  {msg.text}
</div>
  )
)}

                  <div style={styles.meta}>
                    {formatTime(msg.ts)}{" "}
                    {isMine &&
                      (msg.readBy &&
                      Object.keys(msg.readBy).length > 1
                        ? "✓✓"
                        : "✓")}
                    {msg.edited && " (изменено)"}
                  </div>
                </div>
              </div>
            );
          })}

        <div ref={messagesEndRef} />
      </div>

      {Object.keys(typingUsers).length > 0 && (
  <div className="typing-indicator">
    <span className="typing-name">
      {Object.values(typingUsers)[0].name}
    </span>
    <span className="typing-dots">
      <span>.</span>
      <span>.</span>
      <span>.</span>
    </span>
  </div>
)}

      {replyTo && (
        <div style={styles.replyBar}>
          Ответ: {replyTo.text}
          <button onClick={() => setReplyTo(null)}>
            ✖
          </button>
        </div>
      )}

      {selectedMessage && (
        <div
          className="menu-overlay"
          onClick={() => setSelectedMessage(null)}
        >
          <div
            className="menu-box"
            onClick={(e) => e.stopPropagation()}
          >
<button
  onClick={() => {
    if (selectedMessage?.text) {
      navigator.clipboard.writeText(selectedMessage.text);
    }
    setSelectedMessage(null);
  }}
>
  Копировать
</button>

            <button onClick={() => deleteForEveryone(selectedMessage)}>
              Удалить у всех
            </button>
            <button
  onClick={() => {
    setSelectionMode(true);
    setSelectedIds([selectedMessage.id]);
    setSelectedMessage(null);
  }}
>
  Выделить
</button>
            <button onClick={() => deleteForMe(selectedMessage)}>
              Удалить у меня
            </button>
            {selectedMessage.senderId === auth.currentUser.uid && (
              <button
                onClick={() => {
                  setEditingMessage(selectedMessage);
                  setInput(selectedMessage.text);
                  setSelectedMessage(null);
                }}
              >
                Редактировать
              </button>
            )}
            <button onClick={() => pinMessage(selectedMessage)}>
              Закрепить
            </button>
          </div>
        </div>
      )}

{pendingFile && (
  <div style={{
    padding: 10,
    background: "#1a1a28",
    borderTop: "1px solid #333",
    display: "flex",
    alignItems: "center",
    gap: 10
  }}>
    {pendingFile.type.startsWith("image") ? (
      <img
        src={URL.createObjectURL(pendingFile)}
        style={{
          width: 60,
          height: 60,
          objectFit: "cover",
          borderRadius: 8
        }}
      />
    ) : (
      <video
        src={URL.createObjectURL(pendingFile)}
        style={{
          width: 60,
          height: 60,
          borderRadius: 8
        }}
      />
    )}

    <button
      onClick={() => setPendingFile(null)}
      style={{
        background: "red",
        border: "none",
        color: "white",
        borderRadius: "50%",
        width: 24,
        height: 24,
        cursor: "pointer"
      }}
    >
      ✖
    </button>
  </div>
)}

      <div style={styles.inputBar}>

  {/* КНОПКА + */}
  <button
    onClick={() => fileInputRef.current.click()}
    style={{
      width: 40,
      borderRadius: 8,
      background: "#444",
      border: "none",
      color: "white",
      cursor: "pointer"
    }}
  >
    +
  </button>

  {/* СКРЫТЫЙ INPUT */}
  <input
    type="file"
    ref={fileInputRef}
    style={{ display: "none" }}
    accept="*"
    onChange={handleFile}
  />

  <textarea
  value={input}
  onChange={(e) => {
    setInput(e.target.value);
    sendTyping();
  }}
  onKeyDown={(e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }}
  onPaste={handlePaste}
  style={styles.textarea}
/>

  <button
    onClick={sendMessage}
    style={styles.sendBtn}
  >
    ➤
  </button>

</div>

{fullscreenImage && (
  <div
    onClick={() => setFullscreenImage(null)}
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(0,0,0,0.9)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
      cursor: "zoom-out"
    }}
  >
    <img
      src={fullscreenImage}
      style={{
        maxWidth: "95%",
        maxHeight: "95%",
        borderRadius: 12
      }}
    />
  </div>
)}

          </div>
    </div>
  );
}

/* ===========================
   Styles (твой оригинал)
=========================== */

const styles = {
  app: {
    height: "100vh",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    background: "#111",
    color: "white",
  },
  header: {
    padding: 12,
    background: "#1c1c28",
    display: "flex",
    justifyContent: "space-between",
  },
  statusText: {
    fontSize: 12,
    opacity: 0.7,
  },
  pinned: {
    background: "#23233a",
    padding: 8,
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: 12,
  },
  messageRow: {
    display: "flex",
    marginBottom: 10,
  },
  bubble: {
  maxWidth: "75%",
  padding: 10,
  borderRadius: 18,
  wordBreak: "break-word",
  overflow: "hidden"
},
  senderName: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#8ab4f8",
  },
  replyBlock: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 5,
  },
  meta: {
    fontSize: 10,
    opacity: 0.6,
    marginTop: 4,
  },
  typing: {
    padding: "4px 12px",
    fontSize: 12,
    opacity: 0.7,
  },
  replyBar: {
    background: "#222",
    padding: 6,
    display: "flex",
    justifyContent: "space-between",
  },
  inputBar: {
    padding: 10,
    background: "#1c1c28",
    display: "flex",
    gap: 8,
  },
  textarea: {
    flex: 1,
    borderRadius: 8,
    padding: 6,
  },
  sendBtn: {
    padding: "6px 12px",
    borderRadius: 8,
    background: "#7C6AF5",
    border: "none",
    color: "white",
  },
  loginWrapper: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#111",
  },
  loginBox: {
    background: "#1c1c28",
    padding: 40,
    borderRadius: 20,
    width: 300,
    textAlign: "center",
  },
  input: {
    width: "100%",
    padding: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  button: {
    marginTop: 15,
    width: "100%",
    padding: 10,
    borderRadius: 8,
    background: "#7C6AF5",
    border: "none",
    color: "white",
  },
};