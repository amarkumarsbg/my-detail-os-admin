"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  Smile,
  Flower2,
  Coffee,
  Trophy,
  Car,
  Lightbulb,
  Hash,
  Flag,
  Search,
} from "lucide-react";

const RECENT_KEY = "admin_support_recent_emojis";

const CATEGORIES: {
  id: string;
  label: string;
  icon: typeof Smile;
  emojis: string[];
}[] = [
  {
    id: "smileys",
    label: "Smileys & People",
    icon: Smile,
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊",
      "😇", "🥰", "😍", "🤩", "😘", "😗", "☺️", "😚", "😙", "🥲", "😋", "😛",
      "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑",
      "😶", "😏", "😒", "🙄", "😬", "😮‍💨", "🤥", "😌", "😔", "😪", "🤤", "😴",
      "😷", "🤒", "🤕", "🤢", "🤮", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳",
      "🥸", "😎", "🤓", "🧐", "😕", "🫤", "😟", "🙁", "☹️", "😮", "😯", "😲",
      "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣",
      "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "👍", "👎", "👏",
      "🙌", "🤝", "🙏", "💪", "✌️", "🤞", "👋", "👌", "🤌", "🫶",
    ],
  },
  {
    id: "nature",
    label: "Animals & Nature",
    icon: Flower2,
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮",
      "🐷", "🐸", "🐵", "🙈", "🙉", "🙊", "🐔", "🐧", "🐦", "🐤", "🦄", "🐝",
      "🐛", "🦋", "🐌", "🐞", "🐢", "🐍", "🐙", "🐠", "🐟", "🐬", "🐳", "🌸",
      "💮", "🌹", "🌺", "🌻", "🌼", "🌷", "🌱", "🌲", "🌳", "🌴", "🌵", "🍀",
    ],
  },
  {
    id: "food",
    label: "Food & Drink",
    icon: Coffee,
    emojis: [
      "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍒", "🍑", "🥭",
      "🍍", "🥥", "🥝", "🍅", "🥑", "🍆", "🥔", "🥕", "🌽", "🌶️", "🥒", "🥬",
      "🍞", "🥐", "🥖", "🧀", "🥚", "🍳", "🥞", "🥓", "🍔", "🍟", "🍕", "🌭",
      "🥪", "🌮", "🌯", "🥗", "🍝", "🍜", "🍣", "🍱", "🍦", "🍩", "🍪", "🎂",
      "☕", "🍵", "🧃", "🥤", "🧋", "🍺", "🍻", "🥂", "🍷", "🥃",
    ],
  },
  {
    id: "activity",
    label: "Activity",
    icon: Trophy,
    emojis: [
      "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🎱", "🏓", "🏸", "🏒", "🥊",
      "⛳", "🏹", "🎣", "🤿", "🎽", "🛹", "🛼", "🛷", "⛸️", "🎿", "🏆", "🥇",
      "🥈", "🥉", "🎖️", "🏅", "🎯", "🎮", "🎲", "🧩", "♟️", "🎭", "🎨", "🎬",
    ],
  },
  {
    id: "travel",
    label: "Travel & Places",
    icon: Car,
    emojis: [
      "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚",
      "🚛", "🚜", "🛵", "🏍️", "🛺", "🚲", "🛴", "✈️", "🛫", "🛬", "🚀", "🛸",
      "🚁", "🛶", "⛵", "🚢", "🏠", "🏡", "🏢", "🏣", "🏥", "🏦", "🏨", "🏫",
      "🗽", "🗼", "🏰", "🏯", "🏟️", "🌅", "🌄", "🌠", "🌌", "🌉",
    ],
  },
  {
    id: "objects",
    label: "Objects",
    icon: Lightbulb,
    emojis: [
      "⌚", "📱", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "💽", "💾", "💿", "📀", "📷",
      "📸", "📹", "🎥", "📞", "☎️", "📺", "📻", "🧭", "⏱️", "⏰", "⏳", "🔋",
      "🔌", "💡", "🔦", "🕯️", "💵", "💴", "💶", "💷", "💰", "💳", "💎", "⚖️",
      "🛠️", "🔧", "🔨", "⚙️", "🔗", "📎", "📌", "📍", "✂️", "🔑", "🗝️", "🔒",
    ],
  },
  {
    id: "symbols",
    label: "Symbols",
    icon: Hash,
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕",
      "💞", "💓", "💗", "💖", "💘", "💝", "✅", "❌", "⭕", "❗", "❓", "‼️",
      "⁉️", "💯", "💢", "💥", "💫", "💦", "💨", "🕳️", "💣", "💬", "👁️‍🗨️", "🗨️",
      "🗯️", "💭", "💤", "🔔", "🔕", "🎵", "🎶", "➕", "➖", "➗", "✖️", "♾️",
    ],
  },
  {
    id: "flags",
    label: "Flags",
    icon: Flag,
    emojis: [
      "🏁", "🚩", "🎌", "🏴", "🏳️", "🏳️‍🌈", "🇮🇳", "🇺🇸", "🇬🇧", "🇨🇦", "🇦🇺", "🇩🇪",
      "🇫🇷", "🇯🇵", "🇨🇳", "🇧🇷", "🇿🇦", "🇦🇪", "🇸🇬", "🇲🇾", "🇳🇵", "🇱🇰", "🇧🇩", "🇵🇰",
    ],
  },
];

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is string => typeof e === "string").slice(0, 32);
  } catch {
    return [];
  }
}

function persistRecent(emojis: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(emojis.slice(0, 32)));
  } catch {
    /* ignore */
  }
}

interface EmojiPickerProps {
  onPick: (emoji: string) => void;
  onClose?: () => void;
}

export function EmojiPicker({ onPick, onClose }: EmojiPickerProps) {
  const [tab, setTab] = useState<"emoji" | "gif" | "sticker">("emoji");
  const [category, setCategory] = useState("recent");
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  const categoryTabs = useMemo(
    () => [{ id: "recent", label: "Recent", icon: Clock }, ...CATEGORIES],
    []
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      const all = CATEGORIES.flatMap((c) => c.emojis);
      // Simple filter: show all that include query if user typed emoji char, else show smileys subset
      const matched = all.filter((e) => e.includes(q));
      return [
        {
          id: "search",
          label: matched.length ? "Search results" : "No matches",
          emojis: matched.length ? matched : CATEGORIES[0]!.emojis.slice(0, 24),
        },
      ];
    }
    if (category === "recent") {
      return [
        {
          id: "recent",
          label: "Recent",
          emojis: recent.length ? recent : ["✅", "👍", "🙏", "😊", "🎉", "🔥", "❤️", "👏"],
        },
        {
          id: "smileys",
          label: "Smileys & People",
          emojis: CATEGORIES[0]!.emojis,
        },
      ];
    }
    const cat = CATEGORIES.find((c) => c.id === category);
    return cat ? [{ id: cat.id, label: cat.label, emojis: cat.emojis }] : [];
  }, [category, query, recent]);

  function pick(emoji: string) {
    const next = [emoji, ...recent.filter((e) => e !== emoji)].slice(0, 32);
    setRecent(next);
    persistRecent(next);
    onPick(emoji);
  }

  return (
    <div
      role="dialog"
      aria-label="Emoji picker"
      style={{
        width: "min(360px, calc(100vw - 32px))",
        height: 360,
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 8px 28px rgba(11,20,26,0.18)",
        border: "1px solid #e9edef",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {tab === "emoji" ? (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-around",
              padding: "8px 6px 0",
              borderBottom: "1px solid #e9edef",
            }}
          >
            {categoryTabs.map((c) => {
              const Icon = c.icon;
              const active = category === c.id && !query;
              return (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  onClick={() => {
                    setQuery("");
                    setCategory(c.id);
                  }}
                  style={{
                    width: 34,
                    height: 34,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: active ? "#00a884" : "#8696a0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderBottom: active ? "2px solid #00a884" : "2px solid transparent",
                  }}
                >
                  <Icon size={18} />
                </button>
              );
            })}
          </div>

          <div style={{ padding: "8px 10px" }}>
            <div style={{ position: "relative" }}>
              <Search
                size={14}
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#8696a0",
                }}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search emoji"
                style={{
                  width: "100%",
                  height: 34,
                  borderRadius: 8,
                  border: "1px solid #00a884",
                  padding: "0 10px 0 32px",
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box",
                  background: "#fff",
                  color: "#111b21",
                }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: "0 8px 8px" }}>
            {visible.map((section) => (
              <div key={section.id} style={{ marginBottom: 10 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#54656f",
                    padding: "6px 4px",
                  }}
                >
                  {section.label}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(8, 1fr)",
                    gap: 2,
                  }}
                >
                  {section.emojis.map((emoji, i) => (
                    <button
                      key={`${section.id}-${emoji}-${i}`}
                      type="button"
                      onClick={() => pick(emoji)}
                      style={{
                        width: "100%",
                        aspectRatio: "1",
                        border: "none",
                        background: "transparent",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 22,
                        lineHeight: 1,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "#f0f2f5";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#8696a0",
            fontSize: 13,
            padding: 24,
            textAlign: "center",
          }}
        >
          {tab === "gif" ? "GIF search coming soon" : "Stickers coming soon"}
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              style={{
                display: "block",
                marginTop: 12,
                border: "none",
                background: "none",
                color: "#00a884",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Close
            </button>
          ) : null}
        </div>
      )}

      <div
        style={{
          display: "flex",
          borderTop: "1px solid #e9edef",
          background: "#f0f2f5",
        }}
      >
        {(
          [
            { id: "emoji", label: "Emoji", icon: Smile },
            { id: "gif", label: "GIF", icon: Hash },
            { id: "sticker", label: "Sticker", icon: Flower2 },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                flex: 1,
                height: 44,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: active ? "#00a884" : "#54656f",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                borderTop: active ? "2px solid #00a884" : "2px solid transparent",
              }}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
