import { UserService } from "./user.service";

export class RegisterService {
  userService = new UserService();

  async validatePrimaryRegisterData(form, confirmPassword) {
    const errors = {};
    const fieldsRequiredStep1 = ["firstName", "lastName", "email", "password", "role"];

    for (const field of fieldsRequiredStep1) {
      const val = (form[field] ?? "").toString().trim();
      if (!val.length) errors[field] = `Field ${field} is required.`;
    }

    if (form.email && !this.isValidEmail(form.email)) {
      errors.email = "Please enter a valid email address.";
    }

    if ((form.password ?? "") !== (confirmPassword ?? "")) {
      errors.password = "Passwords do not match.";
    }

    // Si quieres validación async de correo duplicado, ponla aquí

    return { valid: Object.keys(errors).length === 0, errors };
  }

  isValidEmail(email) {
    const emailRegex =
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * Envía el signup al backend.
   * Devuelve la respuesta de axios (resp.status 201/200 al éxito).
   * Lanza error con mensaje legible si falla.
   */
  async signUpUser(form) {
    // Normalizar payload según el nuevo formato del backend
    const user = {
      name: (form.firstName ?? "").toString().trim(),
      lastName: (form.lastName ?? "").toString().trim(),
      email: (form.email ?? "").toString().trim(),
      password: (form.password ?? "").toString(),
      roles: [form.role],
    };

    try {
      const response = await this.userService.signUpUser(user);
      // response es el objeto de axios (status, data, etc.)
      return response;
    } catch (error) {
      // Propaga un error legible para el componente
      const message =
          error?.response?.data ??
          error?.message ??
          "Error inesperado al registrar.";
      console.error("Error al registrar el usuario:", message);
      throw new Error(message);
    }
  }
}
