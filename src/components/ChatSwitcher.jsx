import { useState, useRef, useEffect } from "react";
import "./ChatSwitcher.css";

export default function ChatSwitcher({
  chats,
  activeChat,
  setActiveChat,
  createChat,
  deleteChat
}) {

  // состояние выбранного чата (для удаления)
  const [selectedChat, setSelectedChat] = useState(null);

  // таймер удержания
  const longPressTimer = useRef(null);

  // запуск удержания
  function startPress(chatId) {
    longPressTimer.current = setTimeout(() => {
      setSelectedChat(chatId);

      // вибрация на телефоне
      if (navigator.vibrate) {
        navigator.vibrate(40);
      }

    }, 500); // 0.5 секунды
  }

  // отмена удержания
  function cancelPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  }

  return (
    <div className="chat-switcher">
      {chats.map(chat => (
        <div
          key={chat.id}
          className={`switch-item ${
            activeChat === chat.id ? "active" : ""
          }`}
          style={{ position: "relative" }}

          // ПК
          onMouseDown={() => startPress(chat.id)}
          onMouseUp={cancelPress}
          onMouseLeave={cancelPress}

          // Телефон
          onTouchStart={() => startPress(chat.id)}
          onTouchEnd={cancelPress}

          // обычный клик
          onClick={() => {
  // если открыт режим удаления и нажали на другой чат — закрыть режим
  if (selectedChat && selectedChat !== chat.id) {
    setSelectedChat(null);
    return;
  }

  // если режим удаления не активен — открыть чат
  if (!selectedChat) {
    setActiveChat(chat.id);
  }
}}
        >
          {chat.id === "ai-chat" ? "🤖" : "💬"}

          {/* Кнопка удаления */}
          {selectedChat === chat.id && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                deleteChat(chat.id);
                setSelectedChat(null);
              }}
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                background: "#ff3b30",
                color: "white",
                borderRadius: "50%",
                width: 24,
                height: 24,
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 0 6px rgba(0,0,0,0.4)"
              }}
            >
              ✖
            </div>
          )}
        </div>
      ))}

      {/* Кнопка создания чата */}
      <div
        className="switch-item switch-add"
        onClick={createChat}
      >
        +
      </div>
    </div>
  );
}