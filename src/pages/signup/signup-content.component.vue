<script>
import { RegisterService } from '@/services/register.service';

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
      success_message: 'Your account has been created successfully!'
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
  <div class="signup-container min-h-screen flex">
    <div class="logo-container flex">
      <img src="../../assets/taskmaster-logo.svg" alt="logo" style="width: 100px; height: auto; filter: brightness(0) saturate(100%) invert(18%) sepia(98%) saturate(4425%) hue-rotate(348deg) brightness(94%) contrast(98%);" />
      <span class="font-bold text-4xl">TaskMaster</span>
    </div>
    <div class="card flex">
      <span class="title font-normal" style="font-size:1rem">Transform your fundraising efforts with precision
        analytics.</span>

      <form @submit.prevent>

        <div class="flex flex-column gap-3 align-items-center">
          <div class="user-name-container">
            <div class="input-container">
              <input type="text" placeholder="First Name" class="input-field p-3" v-model="form.firstName" />
              <p v-if="errors.firstName" class="error-message">{{ errors.firstName }}</p>
            </div>

            <div class="input-container">
              <input type="text" placeholder="Last Name" class="input-field p-3" v-model="form.lastName" />
              <p v-if="errors.lastName" class="error-message">{{ errors.lastName }}</p>
            </div>
          </div>

          <div class="input-container">
            <input type="email" placeholder="Institution Email" class="input-field  p-3" v-model="form.email" />
            <p v-if="errors.email" class="error-message">{{ errors.email }}</p>
          </div>

          <div class="password-field">
            <input :type="passwordFieldType" placeholder="Password" class="input-field p-3" v-model="form.password" />
            <i :class="passwordFieldType === 'password' ? 'pi pi-eye' : 'pi pi-eye-slash'"
               @click="togglePasswordFieldType" class="toggle-icon"></i>
            <p v-if="errors.password" class="error-message">{{ errors.password }}</p>
          </div>

          <div class="confirm-password-field">
            <input :type="confirmPasswordFieldType" placeholder="Confirm password" class="input-field p-3"
                   v-model="confirmPassword" />
            <i :class="confirmPasswordFieldType === 'password' ? 'pi pi-eye' : 'pi pi-eye-slash'"
               @click="toggleConfirmPasswordFieldType" class="toggle-icon"></i>
            <p v-if="errors.confirmPassword" class="error-message">{{ errors.confirmPassword }}</p>
          </div>

          <div class="radio-button-container">
            <input class="radio-input" type="radio" id="leader" name="type_user" value="ROLE_LEADER" v-model="form.role" />
            <label class="radio-label" for="leader">Leader</label>

            <input class="radio-input" type="radio" id="member" name="type_user" value="ROLE_MEMBER" v-model="form.role" />
            <label class="radio-label" for="member">Member</label>
          </div>
          <p v-if="errors.role" class="error-message">{{ errors.role }}</p>

          <p v-if="apiError" class="error-message text-center mt-3">{{ apiError }}</p>
        </div>

        <div class="flex flex-row gap-3 justify-content-center align-items-center mt-4">
          <button type="button" class="button p-3" style="color: #fff;"
                  @click="onSubmitRegister" :disabled="isSubmitting">
            <span v-if="isSubmitting">Processing...</span>
            <span v-else>Sign Up</span>
          </button>
        </div>
      </form>
    </div>

    <h3 class="card-footer">Already have an account?
      <router-link to="/login" class="link brand-link" style="font-weight: 600">Log in</router-link>
    </h3>

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
  --brand-500: #b22222;
  --brand-600: #8f1c1c;
  --brand-700: #6f1616;
  --brand-100: #f8e1e1;
  --brand-50: #fdf5f5;
}
.error-message {
  color: red;
  font-size: 0.8rem;
  margin-top: 5px;
  text-align: left;
  width: 100%;
}

.signup-container {
  background-color: var(--brand-50);
  box-sizing: border-box;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
}

.input-container {
  width: 90%;
  display: flex;
  flex-direction: column;
  gap: 5px;
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

.title {
  margin-bottom: 40px;
  font-size: 0.8rem;
}

.input-field {
  align-self: center;
  width: 100%;
  border-radius: 20px;
  border: 1px solid #BDBDBD;
  color: #0009;
}

.user-name-container {
  align-self: center;
  width: 90%;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.input-field:focus {
  background-color: #F7F7F7;
}

.button {
  width: 40%;
  align-self: center;
  background-color: var(--brand-500);
  border: none;
  border-radius: 30px;
  cursor: pointer;
}

.button:hover {
  background-color: var(--brand-600);
}

.button:disabled {
  background-color: var(--brand-100);
  cursor: not-allowed;
}

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

.card-footer {
  font-weight: normal;
  font-size: 1rem;
  margin: 0 0 3rem 0;
}

.radio-button-container {
  margin-top: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
}

.radio-label {
  margin-right: 25px;
  line-height: 32px;
  font-size: 0.9rem;
}

.radio-input {
  appearance: none;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  border: 2px solid #999;
  transition: 0.2s all linear;
  margin-right: 5px;
  position: relative;
}

.radio-input:checked {
  border: 8px solid var(--brand-500);
}

.password-field,
.confirm-password-field {
  align-self: center;
  position: relative;
  width: 90%;
  display: flex;
  align-items: center;
  flex-direction: column;
}

.password-field input,
.confirm-password-field input {
  width: 100%;
  padding-right: 45px;
}

.toggle-icon {
  color: #575757;
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  font-size: 1.1rem;
}


@media screen and (max-width: 500px) {
  .logo-container {
    flex-direction: column;
    text-align: center;
  }
  .input-field {
    width: 100%;
  }
  .password-field,
  .confirm-password-field {
    width: 90%;
  }
  .link {
    width: 100%;
  }
  .user-name-container {
    flex-direction: column;
    width: 100%;
    gap: 1rem;
  }
}

@media screen and (max-width: 560px) {
  .button {
    width: 80%;
  }
}
</style>