<script>
export default {
  name: 'ChangePasswordModal',
  props: {
    visible: Boolean,
    submitting: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:visible', 'changePassword'],
  data() {
    return {
      form: {
        current: '',
        new: '',
        confirm: ''
      }
    };
  },
  computed: {
    isDarkTheme() {
      return document.documentElement.dataset.theme === 'dark';
    }
  },
  watch: {
    visible(value) {
      if (!value) {
        this.resetForm();
      }
    }
  },
  methods: {
    close() {
      if (this.submitting) return;
      this.$emit('update:visible', false);
    },
    resetForm() {
      this.form = { current: '', new: '', confirm: '' };
    },
    submit() {
      if (this.form.new !== this.form.confirm) {
        alert(this.$t('profile.passwordMismatch'));
        return;
      }
      if (this.form.new.length < 6) {
        alert(this.$t('profile.passwordMinLength'));
        return;
      }
      this.$emit('changePassword', {
        current: this.form.current,
        new: this.form.new
      });
    }
  }
};
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click.self="close">
    <div class="modal-box" :class="{ 'dark-modal': isDarkTheme }">
      <div class="modal-header">
        <h2 class="modal-title">{{ $t('profile.changePassword') }}</h2>
        <button class="modal-close" @click="close"><i class="pi pi-times"></i></button>
      </div>

      <div class="modal-body">
        <div class="edit-form">
          <div class="form-group">
            <label>{{ $t('profile.currentPassword') }}</label>
            <input type="password" v-model="form.current" :placeholder="$t('profile.enterCurrentPassword')" />
          </div>
          <div class="form-group">
            <label>{{ $t('profile.newPassword') }}</label>
            <input type="password" v-model="form.new" :placeholder="$t('profile.enterNewPassword')" />
          </div>
          <div class="form-group">
            <label>{{ $t('profile.confirmPassword') }}</label>
            <input type="password" v-model="form.confirm" :placeholder="$t('profile.confirmNewPassword')" />
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" :disabled="submitting" @click="close">{{ $t('profile.cancel') }}</button>
        <button class="btn-save" :disabled="submitting" @click="submit">
          {{ submitting ? $t('profile.updating') : $t('profile.updatePassword') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-box {
  background: white;
  border-radius: 18px;
  width: 450px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 1.5rem 1.5rem 0.5rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #B80035;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.5rem;
  color: #B80035;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
}

.form-group input {
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
}

.form-group input:focus {
  border-color: #B80035;
}

.btn-cancel,
.btn-save {
  padding: 0.6rem 1.5rem;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-cancel {
  background: white;
  border: 1px solid #e0e0e0;
  color: #666;
}

.btn-cancel:hover {
  background: #f5f5f5;
}

.btn-save {
  background: #B80035;
  border: none;
  color: white;
}

.btn-save:hover {
  background: #8f0028;
}

.btn-cancel:disabled,
.btn-save:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.modal-box.dark-modal {
  background: linear-gradient(145deg, rgba(18, 23, 33, 0.98), rgba(10, 14, 22, 0.98));
  border: 1px solid rgba(244, 63, 115, 0.24);
  color: #eef2f8;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.35);
}

.dark-modal .modal-header,
.dark-modal .modal-footer {
  border-color: #252b38;
}

.dark-modal .modal-title,
.dark-modal .modal-close {
  color: #ff4f82;
}

.dark-modal .form-group label {
  color: #eef2f8;
}

.dark-modal .form-group input {
  background: #10141d;
  border-color: #242a36;
  color: #eef2f8;
}

.dark-modal .form-group input::placeholder {
  color: #7d8798;
}

.dark-modal .form-group input:focus {
  border-color: #ff4f82;
}

.dark-modal .btn-cancel {
  background: #10141d;
  border-color: #242a36;
  color: #a7b0bf;
}

.dark-modal .btn-cancel:hover {
  background: rgba(244, 63, 115, 0.08);
}

.dark-modal .btn-save {
  background: #e11d48;
}

.dark-modal .btn-save:hover {
  background: #be123c;
}
</style>
