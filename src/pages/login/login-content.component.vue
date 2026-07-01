<script>
import { UserService } from "@/services/user.service.js";
import taskmasterLogo from "@/assets/taskmaster-logo.svg?url";

export default {
  name: "login-content",
  data() {
    return {
      userService: new UserService(),
      email: "",
      password: "",
      formValid: false,
      passwordFieldType: "password",
      isRegistered: false,
      showDialog: false,
      message_error: "",
      logoUrl: taskmasterLogo,
      leftImageUrl: "src/assets/login.png"
    };
  },
  methods: {
    async handleSubmitLogin() {
      this.isRegistered = false;
      const normalizedEmail = (this.email ?? '').toString().trim();

      let res;
      try {
        res = await this.userService.signInUser(normalizedEmail, this.password);
      } catch (err) {
        this.message_error = err?.response?.data ?? err?.message ?? "No se pudo contactar al servidor.";
        this.showDialog = true;
        return;
      }

      if (res?.status === 200) {
        const token = res.data.token;
        localStorage.setItem('token', token);

        try {
          const userResponse = await this.userService.getUserByEmail(normalizedEmail);
          const userData = userResponse.data;

          if (!userData.roles || userData.roles.length === 0) {
            userData.roles = ['ROLE_MEMBER'];
          }
          if (!userData.projectIds || userData.projectIds.length === 0) {
            userData.projectIds = [];
          }

          this.$store.commit('setUserData', userData);

          this.isRegistered = true;
          this.$router.push("/home");
        } catch (error) {
          this.userService.clearSession();
          this.message_error = "Could not load user data";
          this.showDialog = true;
        }
      } else {
        const msg = res?.response?.data || "Login failed";
        this.message_error = typeof msg === "string" ? msg : "Login failed";
        this.showDialog = true;
        await this.resetAndRerenderCaptcha();
      }
    },

    validateForm() {
      this.formValid = this.email !== "" && this.password !== "";
    },

    togglePasswordFieldType() {
      this.passwordFieldType =
          this.passwordFieldType === "password" ? "text" : "password";
    },
  },

  mounted() {
    const gtagId = import.meta.env.VITE_GTAG;
  },
};
</script>

<template>
  <div class="login-container">
    <section class="login-shell">
      <div class="brand-panel" :style="leftImageUrl ? { backgroundImage: `url(${leftImageUrl})` } : {}"></div>

      <div class="form-panel">
        <div class="card">
          <div class="card-logo">
            <img :src="logoUrl" alt="logo" />
          </div>
          <h2 class="title">Welcome back!</h2>
          <p class="subtitle">Sign in to continue to TaskMaster</p>

          <form class="login-form" @submit.prevent="handleSubmitLogin">
            <label class="field-label">Email address</label>
            <input
                type="email"
                placeholder="Enter your email"
                class="input-field"
                v-model="email"
                @input="validateForm"
            />

            <label class="field-label">Password</label>
            <div class="password-field">
              <input
                  :type="passwordFieldType"
                  placeholder="Enter your password"
                  class="input-field"
                  v-model="password"
                  @input="validateForm"
              />
              <i
                  :class="passwordFieldType === 'password' ? 'pi pi-eye' : 'pi pi-eye-slash'"
                  @click="togglePasswordFieldType"
                  class="toggle-icon"
              ></i>
            </div>

            <a class="link brand-link" href="#">
              Forgot your password?
            </a>

            <button :disabled="!formValid" type="submit" class="button">
              <span>Sign in</span>
              <i class="pi pi-arrow-right"></i>
            </button>
          </form>

          <h3 class="card-footer">
            New to TaskMaster?
            <router-link to="/register" class="brand-link">Join now</router-link>
          </h3>
        </div>
      </div>
    </section>

    <pv-dialog :style="{ margin: '0 10px' }" :visible.sync="showDialog" :modal="true" :closable="false">
      <div class="error-modal p-5 flex flex-column align-items-center gap-5 text-center">
        <i class="text-7xl pi pi-exclamation-circle text-red-500"></i>
        <h1>Login Failed!</h1>
        <p class="text-md">{{ message_error }}</p>
        <pv-button class="py-3 px-5" label="OK" @click="showDialog = false" />
      </div>
    </pv-dialog>
  </div>
</template>

<style scoped>
.login-container {
  --brand-500: #ff2f68;
  --brand-600: #e11d48;
  --panel: #0d1119;
  --panel-soft: #111824;
  --border: #26303d;
  --text: #f8fafc;
  --muted: #a7b0bf;
  min-height: 100dvh;
  background:
      radial-gradient(circle at 20% 78%, rgba(225, 29, 72, 0.22), transparent 28%),
      linear-gradient(135deg, #05070c 0%, #090d14 52%, #05070c 100%);
  box-sizing: border-box;
  padding: clamp(0.75rem, 1.4vw, 1.25rem);
  display: grid;
  place-items: center;
}

.login-shell {
  width: min(100%, 1180px);
  height: min(720px, calc(100dvh - 2rem));
  min-height: 560px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(340px, 0.86fr);
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
  position: relative;
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
  padding: clamp(1rem, 2.4vw, 2.4rem);
  overflow-y: auto;
}

.card {
  width: min(100%, 25.5rem);
  background: linear-gradient(145deg, rgba(17, 24, 36, 0.92), rgba(8, 12, 20, 0.96));
  border: 1px solid var(--border);
  border-radius: 18px;
  box-shadow: 0 18px 52px rgba(0, 0, 0, 0.32);
  padding: clamp(1.35rem, 2.4vw, 2.1rem);
  text-align: center;
}

.card-logo {
  width: 3.8rem;
  height: 3.8rem;
  margin: 0 auto 1rem auto;
  border-radius: 18px;
  border: 1px solid var(--border);
  display: grid;
  place-items: center;
  background: rgba(17, 24, 36, 0.86);
}

.card-logo img {
  width: 2.65rem;
  height: 2.65rem;
  filter: brightness(0) saturate(100%) invert(33%) sepia(98%) saturate(3592%) hue-rotate(331deg) brightness(103%) contrast(102%);
}

.title {
  color: var(--text);
  font-size: clamp(1.35rem, 2vw, 1.65rem);
  font-weight: 800;
  margin: 0 0 0.5rem 0;
}

.subtitle {
  color: var(--muted);
  font-size: 0.92rem;
  margin: 0 0 1.25rem 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  text-align: left;
}

.field-label {
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 600;
}

.input-field {
  width: 100%;
  min-height: 3rem;
  border-radius: 10px;
  border: 1px solid #2b3442;
  background: rgba(6, 10, 17, 0.72);
  color: var(--text);
  font-size: 0.96rem;
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

.password-field {
  position: relative;
  display: flex;
  align-items: center;
}

.password-field .input-field {
  padding-right: 3rem;
}

.toggle-icon {
  color: #a7b0bf;
  position: absolute;
  right: 1rem;
  cursor: pointer;
}

.link {
  align-self: flex-end;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
}

.brand-link:hover {
  color: #ff6f99;
}

.button {
  width: 100%;
  min-height: 3.1rem;
  margin-top: 0.9rem;
  background: linear-gradient(135deg, #ff174f 0%, #c91343 100%);
  border: none;
  border-radius: 10px;
  color: #fff;
  cursor: pointer;
  font-size: 1rem;
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

.button i {
  font-size: 1rem;
}

.card-footer {
  color: var(--muted);
  font-weight: 400;
  font-size: 0.98rem;
  margin: 1.45rem 0 0 0;
}

.card-footer .brand-link {
  font-weight: 700;
  text-decoration: none;
  margin-left: 0.3rem;
}

@media screen and (max-width: 980px) {
  .login-shell {
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

@media screen and (max-width: 640px) {
  .login-container {
    padding: 0.75rem;
  }

  .login-shell {
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
    padding: 1.25rem;
  }

  .input-field,
  .button {
    min-height: 2.9rem;
  }

  .card-footer {
    font-size: 0.9rem;
  }
}

.recaptcha-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 78px;
  margin: 8px 0;
}
.recaptcha-wrapper iframe[src*="recaptcha"] {
  display: block !important;
  opacity: 1 !important;
  visibility: visible !important;
  transform: none !important;
  filter: none !important;
  position: static !important;
  z-index: 1 !important;
}
.recaptcha-wrapper > div > div { min-height: 78px !important; }
</style>
