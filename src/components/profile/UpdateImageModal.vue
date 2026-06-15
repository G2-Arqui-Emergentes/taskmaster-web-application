<script>
export default {
  name: 'UpdateImageModal',
  props: {
    visible: Boolean,
    currentImageUrl: String
  },
  emits: ['update:visible', 'updateImage'],
  data() {
    return {
      imageUrl: '',
      defaultAvatar: 'https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg'
    };
  },
  watch: {
    visible: {
      immediate: true,
      handler(val) {
        if (val) {
          this.imageUrl = this.currentImageUrl || '';
        }
      }
    }
  },
  methods: {
    close() {
      this.$emit('update:visible', false);
    },
    update() {
      if (!this.imageUrl.trim()) {
        this.$emit('updateImage', this.defaultAvatar);
      } else {
        this.$emit('updateImage', this.imageUrl);
      }
      this.close();
    },
    handleImageError() {
      this.imageUrl = this.defaultAvatar;
    }
  }
};
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click.self="close">
    <div class="modal-box">
      <div class="modal-header">
        <h2 class="modal-title">Update Profile Picture</h2>
        <button class="modal-close" @click="close"><i class="pi pi-times"></i></button>
      </div>

      <div class="modal-body">
        <div class="edit-form">
          <div class="form-group">
            <label>Image URL</label>
            <input type="text" v-model="imageUrl" placeholder="Enter image URL" />
          </div>
          <div class="preview-section" v-if="imageUrl">
            <label>Preview:</label>
            <img :src="imageUrl" class="preview-image" @error="handleImageError" />
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" @click="close">Cancel</button>
        <button class="btn-save" @click="update">Update</button>
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

.preview-section {
  margin-top: 1rem;
  text-align: center;
}

.preview-section label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
}

.preview-image {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  margin: 0 auto;
  border: 2px solid #B80035;
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
</style>