<script>
import { UserService } from "@/services/user.service.js";

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
  <div class="login-container h-screen flex">
    <div class="logo-container flex">
      <img src="../../assets/taskmaster-logo.svg" alt="logo" style="width: 100px; height: auto; filter: brightness(0) saturate(100%) invert(18%) sepia(98%) saturate(4425%) hue-rotate(348deg) brightness(94%) contrast(98%);" />
      <span class="font-bold text-3xl">TaskMaster</span>
    </div>

    <div class="card flex">
      <span class="title brand-accent font-normal text-xl">Welcome!</span>

      <form class="flex flex-column gap-3" @submit.prevent="handleSubmitLogin">
        <input
            type="email"
            placeholder="Email"
            class="input-field p-3"
            v-model="email"
            @input="validateForm"
        />

        <div class="password-field">
          <input
              :type="passwordFieldType"
              placeholder="Password"
              class="input-field p-3"
              v-model="password"
              @input="validateForm"
          />
          <i
              :class="passwordFieldType === 'password' ? 'pi pi-eye' : 'pi pi-eye-slash'"
              @click="togglePasswordFieldType"
              class="toggle-icon"
          ></i>
        </div>

        <a class="link brand-link" href="#" style="font-style: italic; font-size: 0.8rem;">
          Forgot your password?
        </a>


        <button :disabled="!formValid" type="submit" class="button p-3" style="color:#fff;margin-top:30px">
          Sign in
        </button>
      </form>
    </div>

    <h3 class="card-footer">
      New to TaskMaster?
      <router-link to="/register" class="link brand-link" style="font-weight: 600">Join now</router-link>
    </h3>

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
  --brand-500: #b22222;
  --brand-600: #8f1c1c;
  --brand-700: #6f1616;
  --brand-100: #f8e1e1;
  --brand-50: #fdf5f5;
  background-color: var(--brand-50);
  box-sizing: border-box;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
}
.logo-container {
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 4rem;
}
.card {
  width: 100%;
  max-width: 700px;
  background-color: #fff;
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
  height: auto;
  text-align: center;
  justify-content: center;
  padding: 40px;
  margin: 40px;
  flex-direction: column;
}
.title { margin-bottom: 40px; }
.brand-accent {
  color: var(--brand-500);
}
.input-field {
  align-self: center;
  width: 90%;
  border-radius: 20px;
  border: 1px solid #BDBDBD;
  color: #0009;
}
.input-field:focus { background-color: #F7F7F7; }
.button {
  width: 40%;
  align-self: center;
  background-color: var(--brand-500);
  border: none;
  border-radius: 30px;
  cursor: pointer;
}
.button:hover { background-color: var(--brand-600); }
.link {
  width: 90%;
  align-self: center;
  text-align: right;
  text-decoration: none;
}
.brand-link {
  color: var(--brand-500);
}
.brand-link:hover {
  color: var(--brand-600);
}
.card-footer { font-weight: normal; font-size: 1rem; }
.password-field {
  align-self: center;
  position: relative;
  width: 90%;
  display: flex;
  align-items: center;
}
.input-field { flex: 1; padding-right: 2.5rem; }
.toggle-icon {
  color: #575757;
  position: absolute;
  right: 15px;
  cursor: pointer;
}
@media screen and (max-width: 500px) {
  .logo-container { flex-direction: column; text-align: center; }
  .input-field { width: 100%; }
  .password-field { width: 100%; }
  .link { width: 100%; }
}
@media screen and (max-width: 560px) { .button { width: 100%; } }

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