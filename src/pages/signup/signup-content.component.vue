<script>
import { RegisterService } from '@/services/register.service';
import taskmasterLogo from "@/assets/taskmaster-logo.svg?url";
import registerImage from "@/assets/regi.png";

export default {
  name: "signup-content",
  data() {
    return {
      registerService: new RegisterService(),
      confirmPassword: '',
      passwordFieldType: 'password',
      confirmPasswordFieldType: 'password',
      isSubmitting: false,
      showSuccessDialog: false,
      apiError: "",

      form: {
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "",
      },
      errors: {
        email: '',
        password: '',
        confirmPassword: '',
        role: '',
      },
      success_message: 'Your account has been created successfully!',
      logoUrl: taskmasterLogo,
      leftImageUrl: registerImage
    }
  },
  methods: {
    async onSubmitRegister() {
      this.apiError = "";
      const formValidationOne = await this.registerService.validatePrimaryRegisterData(this.form, this.confirmPassword);

      if(!formValidationOne.valid){
        this.errors = formValidationOne.errors;
        return false;
      }

      this.errors = {};
      this.isSubmitting = true;
      try {
        const response = await this.registerService.signUpUser(this.form);

        if (response && (response.status === 200 || response.status === 201)) {
          this.showSuccessDialog = true;
        } else {
          this.apiError = response?.data ?? "Could not complete registration.";
        }
      } catch (e) {
        this.apiError = e?.response?.data ?? e?.message ?? "Unexpected error.";
      } finally {
        this.isSubmitting = false;
      }
    },

    togglePasswordFieldType() {
      this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
    },

    toggleConfirmPasswordFieldType() {
      this.confirmPasswordFieldType = this.confirmPasswordFieldType === 'password' ? 'text' : 'password';
    },

    goToLogin() {
      this.$router.push('/login');
    },
  }
}
</script>

<template>
  <div class="signup-container">
    <section class="signup-shell">
      <div class="brand-panel" :style="leftImageUrl ? { backgroundImage: `url(${leftImageUrl})` } : {}"></div>

      <div class="form-panel">
        <div class="card">
          <div class="card-logo">
            <img :src="logoUrl" alt="logo" />
          </div>

          <h1 class="title">Create your account</h1>
          <p class="subtitle">Fill in your details to get started</p>

          <form class="signup-form" @submit.prevent>
            <div class="user-name-container">
              <div class="input-container">
                <label class="field-label">First name</label>
                <input type="text" placeholder="First Name" class="input-field" v-model="form.firstName" />
                <p v-if="errors.firstName" class="error-message">{{ errors.firstName }}</p>
              </div>

              <div class="input-container">
                <label class="field-label">Last name</label>
                <input type="text" placeholder="Last Name" class="input-field" v-model="form.lastName" />
                <p v-if="errors.lastName" class="error-message">{{ errors.lastName }}</p>
              </div>
            </div>

            <div class="input-container">
              <label class="field-label">Email address</label>
              <input type="email" placeholder="Institution Email" class="input-field" v-model="form.email" />
              <p v-if="errors.email" class="error-message">{{ errors.email }}</p>
            </div>

            <div class="password-field">
              <label class="field-label">Password</label>
              <input :type="passwordFieldType" placeholder="Password" class="input-field" v-model="form.password" />
              <i :class="passwordFieldType === 'password' ? 'pi pi-eye' : 'pi pi-eye-slash'"
                 @click="togglePasswordFieldType" class="toggle-icon"></i>
              <p v-if="errors.password" class="error-message">{{ errors.password }}</p>
            </div>

            <div class="confirm-password-field">
              <label class="field-label">Confirm password</label>
              <input :type="confirmPasswordFieldType" placeholder="Confirm password" class="input-field"
                     v-model="confirmPassword" />
              <i :class="confirmPasswordFieldType === 'password' ? 'pi pi-eye' : 'pi pi-eye-slash'"
                 @click="toggleConfirmPasswordFieldType" class="toggle-icon"></i>
              <p v-if="errors.confirmPassword" class="error-message">{{ errors.confirmPassword }}</p>
            </div>

            <div class="role-section">
              <span class="field-label">I am signing up as</span>
              <div class="radio-button-container">
                <input class="radio-input" type="radio" id="leader" name="type_user" value="ROLE_LEADER" v-model="form.role" />
                <label class="radio-label" for="leader">
                  <i class="pi pi-users"></i>
                  <span>Leader</span>
                </label>

                <input class="radio-input" type="radio" id="member" name="type_user" value="ROLE_MEMBER" v-model="form.role" />
                <label class="radio-label" for="member">
                  <i class="pi pi-user"></i>
                  <span>Member</span>
                </label>
              </div>
              <p v-if="errors.role" class="error-message">{{ errors.role }}</p>
            </div>

            <p v-if="apiError" class="error-message text-center">{{ apiError }}</p>

            <button type="button" class="button"
                    @click="onSubmitRegister" :disabled="isSubmitting">
              <span v-if="isSubmitting">Processing...</span>
              <span v-else>Sign Up</span>
              <i class="pi pi-arrow-right"></i>
            </button>
          </form>

          <h3 class="card-footer">Already have an account?
            <router-link to="/login" class="brand-link">Log in</router-link>
          </h3>
        </div>
      </div>
    </section>

    <pv-dialog :style="{margin: '0 10px'}"
               :visible.sync="showSuccessDialog"
               :modal="true"
               :closable="false">
      <div class="p-5 flex flex-column align-items-center gap-5 text-center">
        <i class="text-7xl pi pi-check-circle text-green-500"></i>
        <h1>Registration successful!</h1>
        <p class="text-md">{{ success_message }}</p>
        <div class="flex gap-3">
          <pv-button class="py-3 px-5" label="Go to login" @click="goToLogin"/>
          <pv-button class="py-3 px-5 p-button-text" label="Close" @click="showSuccessDialog=false"/>
        </div>
      </div>
    </pv-dialog>
  </div>
</template>

<style scoped>
.signup-container {
  --brand-500: #ff2f68;
  --brand-600: #e11d48;
  --border: #26303d;
  --text: #f8fafc;
  --muted: #a7b0bf;
  min-height: 100dvh;
  background:
      radial-gradient(circle at 20% 78%, rgba(225, 29, 72, 0.22), transparent 28%),
      linear-gradient(135deg, #05070c 0%, #090d14 52%, #05070c 100%);
  box-sizing: border-box;
  padding: clamp(0.5rem, 1.1vw, 1rem);
  display: grid;
  place-items: center;
}

.error-message {
  color: #ff6f99;
  font-size: 0.72rem;
  margin: 0.05rem 0 0 0;
  text-align: left;
  width: 100%;
}

.signup-shell {
  width: min(100%, 1180px);
  height: min(700px, calc(100dvh - 1rem));
  min-height: 560px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(380px, 0.92fr);
  border: 1px solid var(--border);
  border-radius: 18px;
  overflow: hidden;
  background: rgba(7, 11, 18, 0.88);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.38);
}

.brand-panel,
.form-panel {
  min-width: 0;
}

.brand-panel {
  border-right: 1px solid var(--border);
  overflow: hidden;
  background:
      linear-gradient(180deg, rgba(5, 7, 12, 0.04), rgba(5, 7, 12, 0.04)),
      rgba(10, 15, 24, 0.52);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.form-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(0.75rem, 1.8vw, 1.6rem);
  overflow-y: auto;
}

.card {
  width: min(100%, 27rem);
  background: linear-gradient(145deg, rgba(17, 24, 36, 0.92), rgba(8, 12, 20, 0.96));
  border: 1px solid var(--border);
  border-radius: 18px;
  box-shadow: 0 18px 52px rgba(0, 0, 0, 0.32);
  padding: clamp(1rem, 1.7vw, 1.45rem);
  text-align: center;
}

.card-logo {
  width: 3.1rem;
  height: 3.1rem;
  margin: 0 auto 0.55rem auto;
  border-radius: 14px;
  border: 1px solid var(--border);
  display: grid;
  place-items: center;
  background: rgba(17, 24, 36, 0.86);
}

.card-logo img {
  width: 2.15rem;
  height: 2.15rem;
  filter: brightness(0) saturate(100%) invert(33%) sepia(98%) saturate(3592%) hue-rotate(331deg) brightness(103%) contrast(102%);
}

.title {
  color: var(--text);
  font-size: clamp(1.2rem, 1.8vw, 1.45rem);
  font-weight: 800;
  margin: 0 0 0.35rem 0;
}

.subtitle {
  color: var(--muted);
  font-size: 0.84rem;
  margin: 0 0 0.75rem 0;
}

.signup-form {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  text-align: left;
}

.input-container,
.password-field,
.confirm-password-field {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
}

.user-name-container {
  display: flex;
  gap: 0.55rem;
}

.field-label {
  color: var(--text);
  font-size: 0.78rem;
  font-weight: 600;
}

.input-field {
  width: 100%;
  min-height: 2.45rem;
  border-radius: 9px;
  border: 1px solid #2b3442;
  background: rgba(6, 10, 17, 0.72);
  color: var(--text);
  font-size: 0.86rem;
  outline: none;
  padding: 0 1rem;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.input-field::placeholder {
  color: #7d8798;
}

.input-field:focus {
  background: rgba(13, 18, 28, 0.95);
  border-color: rgba(255, 47, 104, 0.62);
}

.password-field,
.confirm-password-field {
  position: relative;
}

.password-field input,
.confirm-password-field input {
  padding-right: 3rem;
}

.toggle-icon {
  color: #a7b0bf;
  position: absolute;
  right: 1rem;
  top: 2.2rem;
  cursor: pointer;
  font-size: 1rem;
}

.role-section {
  display: flex;
  flex-direction: column;
  gap: 0.42rem;
}

.radio-button-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
}

.radio-label {
  min-height: 3.25rem;
  border: 1px solid #2b3442;
  border-radius: 12px;
  color: var(--muted);
  cursor: pointer;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.65rem;
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
}

.radio-label i {
  color: #a7b0bf;
  font-size: 1rem;
}

.radio-label span {
  color: var(--text);
  font-weight: 700;
  font-size: 0.86rem;
}

.radio-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.radio-input:checked + .radio-label {
  background: rgba(225, 29, 72, 0.14);
  border-color: var(--brand-500);
}

.radio-input:checked + .radio-label i {
  color: var(--brand-500);
}

.button {
  width: 100%;
  min-height: 2.75rem;
  margin-top: 0.2rem;
  background: linear-gradient(135deg, #ff174f 0%, #c91343 100%);
  border: none;
  border-radius: 10px;
  color: #fff;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  box-shadow: 0 14px 30px rgba(225, 29, 72, 0.26);
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.button:hover {
  transform: translateY(-1px);
}

.button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  transform: none;
}

.brand-link {
  color: var(--brand-500);
  text-decoration: none;
  font-weight: 700;
  margin-left: 0.3rem;
}

.brand-link:hover {
  color: #ff6f99;
}

.card-footer {
  color: var(--muted);
  font-weight: 400;
  font-size: 0.86rem;
  margin: 0.65rem 0 0 0;
}

@media screen and (max-width: 980px) {
  .signup-shell {
    grid-template-columns: 1fr;
    width: min(100%, 680px);
    height: auto;
    min-height: auto;
  }

  .brand-panel {
    border-right: 0;
    border-bottom: 1px solid var(--border);
    min-height: 260px;
  }
}

@media screen and (max-height: 720px) and (min-width: 641px) {
  .signup-shell {
    height: calc(100dvh - 1rem);
    min-height: 0;
  }

  .card {
    padding: 0.9rem 1.1rem;
  }

  .card-logo {
    display: none;
  }

  .subtitle {
    margin-bottom: 0.55rem;
  }

  .signup-form {
    gap: 0.45rem;
  }

  .input-field {
    min-height: 2.3rem;
  }

  .radio-label {
    min-height: 2.8rem;
  }

  .button {
    min-height: 2.55rem;
  }
}

@media screen and (max-width: 640px) {
  .signup-container {
    padding: 0.75rem;
  }

  .signup-shell {
    min-height: calc(100dvh - 1.5rem);
    display: flex;
    border-radius: 16px;
  }

  .brand-panel {
    display: none;
  }

  .form-panel {
    width: 100%;
    padding: 1rem;
  }

  .card {
    width: 100%;
    padding: 1.15rem;
  }

  .user-name-container {
    flex-direction: column;
    gap: 0.75rem;
  }

  .radio-button-container {
    grid-template-columns: 1fr;
  }

  .input-field,
  .button {
    min-height: 2.65rem;
  }
}

@media screen and (max-height: 760px) and (max-width: 640px) {
  .card-logo {
    display: none;
  }

  .card {
    padding: 0.9rem;
  }

  .signup-form {
    gap: 0.45rem;
  }

  .radio-label {
    min-height: 2.75rem;
  }
}
</style>
