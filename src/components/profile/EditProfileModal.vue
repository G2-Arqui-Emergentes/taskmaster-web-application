<script>
export default {
  name: 'EditProfileModal',
  props: {
    visible: Boolean,
    userData: Object
  },
  emits: ['update:visible', 'save'],
  data() {
    return {
      form: {
        name: '',
        lastName: '',
        email: '',
        salary: 0,
        phone: '',
        age: null,
        bio: ''
      }
    };
  },
  computed: {
    isDarkTheme() {
      return document.documentElement.dataset.theme === 'dark';
    }
  },
  watch: {
    visible: {
      immediate: true,
      handler(val) {
        if (val && this.userData) {
          this.form = {
            name: this.userData.name || '',
            lastName: this.userData.lastName || '',
            email: this.userData.email || '',
            salary: this.userData.salary || 0,
            phone: this.userData.phone || '',
            age: this.userData.age || null,
            bio: this.userData.bio || ''
          };
        }
      }
    }
  },
  methods: {
    close() {
      this.$emit('update:visible', false);
    },
    save() {
      this.$emit('save', this.form);
      this.close();
    }
  }
};
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click.self="close">
    <div class="modal-box" :class="{ 'dark-modal': isDarkTheme }">
      <div class="modal-header">
        <h2 class="modal-title">Edit Profile</h2>
        <button class="modal-close" @click="close"><i class="pi pi-times"></i></button>
      </div>

      <div class="modal-body">
        <div class="edit-form">
          <div class="form-group">
            <label>Name</label>
            <input type="text" v-model="form.name" placeholder="Name" />
          </div>
          <div class="form-group">
            <label>Last Name</label>
            <input type="text" v-model="form.lastName" placeholder="Last Name" />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" v-model="form.email" disabled class="disabled-input" />
          </div>
          <div class="form-group">
            <label>Salary</label>
            <input type="number" v-model.number="form.salary" placeholder="Salary" min="0" />
          </div>
          <div class="form-group">
            <label>Phone</label>
            <input type="tel" v-model="form.phone" placeholder="Phone" />
          </div>
          <div class="form-group">
            <label>Age</label>
            <input type="number" v-model.number="form.age" placeholder="Age" min="0" />
          </div>
          <div class="form-group">
            <label>Bio</label>
            <textarea v-model="form.bio" placeholder="Bio" rows="4"></textarea>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" @click="close">Cancel</button>
        <button class="btn-save" @click="save">Save Changes</button>
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
  width: 500px;
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
  flex: 1;
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

.form-group input,
.form-group textarea {
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  font-family: inherit;
}

.form-group textarea {
  resize: vertical;
  min-height: 96px;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: #B80035;
}

.name-inputs {
  display: flex;
  gap: 0.75rem;
}

.name-inputs input {
  flex: 1;
}

.disabled-input {
  background: #f5f5f5;
  cursor: not-allowed;
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

.dark-modal .form-group input,
.dark-modal .form-group textarea {
  background: #10141d;
  border-color: #242a36;
  color: #eef2f8;
}

.dark-modal .form-group input::placeholder,
.dark-modal .form-group textarea::placeholder {
  color: #7d8798;
}

.dark-modal .form-group input:focus,
.dark-modal .form-group textarea:focus {
  border-color: #ff4f82;
}

.dark-modal .disabled-input {
  background: #1b2230;
  color: #7d8798;
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
