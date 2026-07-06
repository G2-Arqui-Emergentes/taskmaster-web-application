<script>
import { ChatbotService } from "@/services/chatbot.service.js";

export default {
  name: "AresChatbot",
  data() {
    return {
      chatbotService: new ChatbotService(),
      isOpen: false,
      showQuickActions: true,
      inputMessage: "",
      isSending: false,
      messages: [
        {
          id: 1,
          role: "assistant",
          textKey: "chatbot.welcome"
        }
      ],
      quickQuestions: [
        { icon: "pi pi-chart-bar", key: "projectSummary", labelKey: "chatbot.quickQuestions.projectSummary", promptKey: "chatbot.prompts.projectSummary" },
        { icon: "pi pi-list-check", key: "myTasks", labelKey: "chatbot.quickQuestions.myTasks", promptKey: "chatbot.prompts.myTasks" },
        { icon: "pi pi-exclamation-triangle", key: "risks", labelKey: "chatbot.quickQuestions.risks", promptKey: "chatbot.prompts.risks" },
        { icon: "pi pi-calendar", key: "deadlines", labelKey: "chatbot.quickQuestions.deadlines", promptKey: "chatbot.prompts.deadlines" },
        { icon: "pi pi-users", key: "teamWorkload", labelKey: "chatbot.quickQuestions.teamWorkload", promptKey: "chatbot.prompts.teamWorkload" }
      ],
      currentTheme: document.documentElement.dataset.theme || localStorage.getItem("theme") || "light"
    };
  },
  computed: {
    isDarkTheme() {
      return this.currentTheme === "dark";
    }
  },
  mounted() {
    window.addEventListener("theme-changed", this.syncTheme);
    window.addEventListener("storage", this.syncTheme);
  },
  beforeUnmount() {
    window.removeEventListener("theme-changed", this.syncTheme);
    window.removeEventListener("storage", this.syncTheme);
  },
  methods: {
    toggleChat() {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        this.$nextTick(() => this.focusInput());
      }
    },
    closeChat() {
      this.isOpen = false;
    },
    toggleQuickActions() {
      this.showQuickActions = !this.showQuickActions;
      if (!this.showQuickActions) {
        this.$nextTick(() => this.focusInput());
      }
    },
    syncTheme(event) {
      this.currentTheme = event?.detail?.theme || document.documentElement.dataset.theme || localStorage.getItem("theme") || "light";
    },
    focusInput() {
      this.$refs.chatInput?.focus();
    },
    resolveMessageText(message) {
      return message.textKey ? this.$t(message.textKey) : message.text;
    },
    extractBotResponse(response) {
      if (typeof response === "string") return response;
      if (!response || typeof response !== "object") return this.$t("chatbot.fallbackResponse");

      return response.answer
          || response.message
          || response.response
          || response.content
          || response.data?.answer
          || response.data?.message
          || this.$t("chatbot.fallbackResponse");
    },
    async sendQuickQuestion(question) {
      await this.sendMessage(this.$t(question.promptKey));
    },
    async submitMessage() {
      await this.sendMessage(this.inputMessage);
    },
    async sendMessage(rawMessage) {
      const message = (rawMessage || "").toString().trim();
      if (!message || this.isSending) return;

      this.messages.push({
        id: Date.now(),
        role: "user",
        text: message
      });
      this.inputMessage = "";
      this.isSending = true;
      this.scrollToBottom();

      try {
        const response = await this.chatbotService.sendMessage(message);
        this.messages.push({
          id: Date.now() + 1,
          role: "assistant",
          text: this.extractBotResponse(response)
        });
      } catch (error) {
        this.messages.push({
          id: Date.now() + 1,
          role: "assistant",
          text: this.$t("chatbot.error")
        });
      } finally {
        this.isSending = false;
        this.scrollToBottom();
      }
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const thread = this.$refs.thread;
        if (thread) thread.scrollTop = thread.scrollHeight;
      });
    }
  }
};
</script>

<template>
  <div class="ares-chatbot" :class="{ 'dark-chatbot': isDarkTheme, open: isOpen }">
    <section v-if="isOpen" class="chat-panel" aria-live="polite">
      <header class="chat-header">
        <div class="bot-identity">
          <span class="bot-avatar"><i class="pi pi-comments"></i></span>
          <div>
            <h2>Ares</h2>
            <small>{{ $t("chatbot.status") }}</small>
          </div>
        </div>
        <button type="button" class="icon-button" :aria-label="$t('chatbot.close')" @click="closeChat">
          <i class="pi pi-times"></i>
        </button>
      </header>

      <div ref="thread" class="chat-thread">
        <div
            v-for="message in messages"
            :key="message.id"
            class="message"
            :class="message.role"
        >
          {{ resolveMessageText(message) }}
        </div>

        <div v-if="isSending" class="message assistant typing">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      <div class="quick-actions-shell" :class="{ collapsed: !showQuickActions }">
        <button
            type="button"
            class="quick-actions-toggle"
            :aria-expanded="showQuickActions"
            :aria-label="showQuickActions ? $t('chatbot.hideQuickQuestions') : $t('chatbot.showQuickQuestions')"
            @click="toggleQuickActions"
        >
          <i :class="showQuickActions ? 'pi pi-angle-down' : 'pi pi-angle-up'"></i>
        </button>

        <Transition name="quick-actions-slide">
          <div v-if="showQuickActions" class="quick-actions">
            <button
                v-for="question in quickQuestions"
                :key="question.key"
                type="button"
                class="quick-action"
                :disabled="isSending"
                @click="sendQuickQuestion(question)"
            >
              <i :class="question.icon"></i>
              <span>{{ $t(question.labelKey) }}</span>
            </button>
          </div>
        </Transition>
      </div>

      <form class="chat-input-row" @submit.prevent="submitMessage">
        <input
            ref="chatInput"
            v-model="inputMessage"
            type="text"
            :placeholder="$t('chatbot.placeholder')"
            :disabled="isSending"
        />
        <button type="submit" class="send-button" :disabled="!inputMessage.trim() || isSending" :aria-label="$t('chatbot.send')">
          <i class="pi pi-search"></i>
        </button>
      </form>
    </section>

    <button type="button" class="launcher" :aria-label="$t('chatbot.open')" @click="toggleChat">
      <span class="launcher-icon"><i class="pi pi-comments"></i></span>
      <strong>Ares</strong>
    </button>
  </div>
</template>

<style scoped>
.ares-chatbot {
  position: fixed;
  right: 1.25rem;
  bottom: 1.25rem;
  z-index: 260;
  font-family: 'Poppins', sans-serif;
}

.chat-panel {
  width: min(22rem, calc(100vw - 2rem));
  height: min(34rem, calc(100vh - 8rem));
  margin-bottom: 0.9rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 24px 70px rgba(17, 24, 39, 0.22);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  min-height: 4.2rem;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.bot-identity {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.bot-avatar {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 50%;
  background: #fde8ef;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex: 0 0 auto;
}

.bot-identity h2 {
  margin: 0;
  color: #111827;
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.2;
}

.bot-identity small {
  color: #6b7280;
  font-size: 0.75rem;
  font-weight: 600;
}

.icon-button,
.launcher,
.quick-action,
.send-button {
  border: 0;
  cursor: pointer;
  font-family: inherit;
}

.icon-button {
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  background: transparent;
  color: #6b7280;
}

.icon-button:hover {
  background: #f3f4f6;
  color: #111827;
}

.chat-thread {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  background: #fafafa;
}

.message {
  max-width: 86%;
  padding: 0.7rem 0.8rem;
  border-radius: 10px;
  font-size: 0.85rem;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.message.assistant {
  align-self: flex-start;
  background: #ffffff;
  color: #111827;
  border: 1px solid #eceff3;
}

.message.user {
  align-self: flex-end;
  background: #e40046;
  color: #ffffff;
}

.typing {
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
}

.typing span {
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 50%;
  background: #9ca3af;
  animation: typing 1s infinite ease-in-out;
}

.typing span:nth-child(2) {
  animation-delay: 0.12s;
}

.typing span:nth-child(3) {
  animation-delay: 0.24s;
}

@keyframes typing {
  0%, 80%, 100% {
    transform: translateY(0);
    opacity: 0.55;
  }
  40% {
    transform: translateY(-0.25rem);
    opacity: 1;
  }
}

.quick-actions {
  padding: 0 1rem 0.85rem;
  display: grid;
  gap: 0.45rem;
}

.quick-actions-shell {
  border-top: 1px solid #e5e7eb;
  overflow: hidden;
  background: #ffffff;
}

.quick-actions-shell.collapsed {
  border-bottom: 0;
}

.quick-actions-toggle {
  width: 100%;
  height: 1.9rem;
  border: 0;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-actions-toggle:hover {
  background: #f9fafb;
  color: #e40046;
}

.quick-actions-toggle i {
  font-size: 1rem;
}

.quick-actions-slide-enter-active,
.quick-actions-slide-leave-active {
  transition: max-height 0.22s ease, opacity 0.18s ease, transform 0.22s ease;
  overflow: hidden;
}

.quick-actions-slide-enter-from,
.quick-actions-slide-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(0.4rem);
}

.quick-actions-slide-enter-to,
.quick-actions-slide-leave-from {
  max-height: 14rem;
  opacity: 1;
  transform: translateY(0);
}

.quick-action {
  min-height: 2.35rem;
  padding: 0 0.75rem;
  border-radius: 8px;
  background: #ffffff;
  color: #111827;
  border: 1px solid #e5e7eb;
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  text-align: left;
  font-size: 0.84rem;
  font-weight: 700;
}

.quick-action i {
  width: 1rem;
  color: #e40046;
}

.quick-action:hover:not(:disabled) {
  background: #fff7fa;
  border-color: #f4b5c8;
}

.quick-action:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.chat-input-row {
  padding: 0.85rem 1rem 1rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.chat-input-row input {
  width: 100%;
  height: 2.45rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0 0.8rem;
  outline: none;
  color: #111827;
  font-size: 0.86rem;
}

.chat-input-row input:focus {
  border-color: #e40046;
}

.send-button {
  width: 2.45rem;
  height: 2.45rem;
  border-radius: 8px;
  background: #e40046;
  color: #ffffff;
  flex: 0 0 auto;
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.launcher {
  min-width: 7.2rem;
  height: 3.1rem;
  padding: 0 1rem;
  border-radius: 999px;
  background: #e40046;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  box-shadow: 0 16px 36px rgba(228, 0, 70, 0.3);
}

.launcher-icon {
  width: 1.85rem;
  height: 1.85rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.launcher-icon i {
  font-size: 0.95rem;
}

.launcher strong {
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: 0;
}

.dark-chatbot .chat-panel {
  background: #10141d;
  border-color: rgba(244, 63, 115, 0.24);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.44);
}

.dark-chatbot .launcher {
  background: #e11d48;
  border: 1px solid rgba(244, 63, 115, 0.24);
  box-shadow: 0 16px 36px rgba(225, 29, 72, 0.22);
}

.dark-chatbot .chat-header,
.dark-chatbot .quick-actions-shell,
.dark-chatbot .chat-input-row {
  border-color: #252b38;
}

.dark-chatbot .bot-avatar {
  background: rgba(225, 29, 72, 0.18);
}

.dark-chatbot .bot-identity h2,
.dark-chatbot .quick-action,
.dark-chatbot .chat-input-row input {
  color: #eef2f8;
}

.dark-chatbot .bot-identity small {
  color: #a7b0bf;
}

.dark-chatbot .icon-button {
  color: #a7b0bf;
}

.dark-chatbot .icon-button:hover,
.dark-chatbot .quick-actions-toggle:hover,
.dark-chatbot .quick-action:hover:not(:disabled) {
  background: rgba(244, 63, 115, 0.08);
}

.dark-chatbot .quick-actions-shell {
  background: #10141d;
}

.dark-chatbot .quick-actions-toggle {
  color: #a7b0bf;
}

.dark-chatbot .quick-actions-toggle:hover {
  color: #ff4f82;
}

.dark-chatbot .chat-thread {
  background: #080b12;
}

.dark-chatbot .message.assistant,
.dark-chatbot .quick-action,
.dark-chatbot .chat-input-row input {
  background: #10141d;
  border-color: #242a36;
}

.dark-chatbot .message.assistant {
  color: #eef2f8;
}

.dark-chatbot .quick-action i {
  color: #ff4f82;
}

.dark-chatbot .chat-input-row input::placeholder {
  color: #7d8798;
}

@media (max-width: 640px) {
  .ares-chatbot {
    right: 0.75rem;
    bottom: 0.75rem;
  }

  .chat-panel {
    width: calc(100vw - 1.5rem);
    height: min(35rem, calc(100vh - 6rem));
  }
}
</style>
