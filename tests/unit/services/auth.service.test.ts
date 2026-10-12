import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthenticationError, ConflictError } from "../../../src/errors/app-error.js";
import { createUser, findUserByEmail } from "../../../src/persistence/user.repository.js";
import { loginUser, registerUser } from "../../../src/services/auth.service.js";
import { verifyAccessToken } from "../../../src/services/token.service.js";
import { buildUser } from "../../helpers/fixtures.js";

// El servicio se prueba aislado: el repositorio (BD) se sustituye por mocks.
vi.mock("../../../src/persistence/user.repository.js", () => ({
  findUserByEmail: vi.fn(),
  createUser: vi.fn()
}));

const findUser = vi.mocked(findUserByEmail);
const insertUser = vi.mocked(createUser);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("registerUser", () => {
  const input = { nombre: "  Ana Pérez ", email: " Ana@Mail.com ", password: "UnaClaveSegura123" };

  it("normaliza datos, guarda un hash bcrypt (no la contraseña) y no devuelve el hash", async () => {
    findUser.mockResolvedValueOnce(null);
    insertUser.mockImplementationOnce(async (data) =>
      buildUser({ nombre: data.nombre, email: data.email, password_hash: data.passwordHash })
    );

    const user = await registerUser(input);

    const saved = insertUser.mock.calls[0]![0];
    expect(findUser).toHaveBeenCalledWith("ana@mail.com");
    expect(saved.nombre).toBe("Ana Pérez");
    expect(saved.email).toBe("ana@mail.com");
    expect(saved.passwordHash).not.toBe(input.password);
    expect(saved.passwordHash).toMatch(/^\$2[aby]\$04\$/); // bcrypt, coste 4 en tests
    expect(await bcrypt.compare(input.password, saved.passwordHash)).toBe(true);
    expect(user).toEqual({ id: "10", nombre: "Ana Pérez", email: "ana@mail.com" });
    expect(user).not.toHaveProperty("password_hash");
  });

  it("lanza ConflictError si el email ya existe", async () => {
    findUser.mockResolvedValueOnce(buildUser());

    await expect(registerUser(input)).rejects.toBeInstanceOf(ConflictError);
    expect(insertUser).not.toHaveBeenCalled();
  });

  it("condición de carrera: UNIQUE violation (23505) en el INSERT → ConflictError", async () => {
    findUser.mockResolvedValueOnce(null);
    insertUser.mockRejectedValueOnce(Object.assign(new Error("duplicate key"), { code: "23505" }));

    await expect(registerUser(input)).rejects.toBeInstanceOf(ConflictError);
  });

  it("otros errores de BD se propagan sin transformarse", async () => {
    findUser.mockResolvedValueOnce(null);
    const dbError = new Error("connection lost");
    insertUser.mockRejectedValueOnce(dbError);

    await expect(registerUser(input)).rejects.toBe(dbError);
  });
});

describe("loginUser", () => {
  const password = "UnaClaveSegura123";

  it("con credenciales correctas devuelve un JWT válido y el usuario público", async () => {
    const hash = await bcrypt.hash(password, 4);
    findUser.mockResolvedValueOnce(buildUser({ password_hash: hash }));

    const result = await loginUser({ email: "ANA@mail.com", password });

    expect(findUser).toHaveBeenCalledWith("ana@mail.com");
    expect(verifyAccessToken(result.token)).toEqual({ id: "10", email: "ana@mail.com" });
    expect(result.user).toEqual({ id: "10", nombre: "Ana Pérez", email: "ana@mail.com" });
  });

  it("contraseña incorrecta → AuthenticationError genérico", async () => {
    findUser.mockResolvedValueOnce(buildUser({ password_hash: await bcrypt.hash(password, 4) }));

    await expect(loginUser({ email: "ana@mail.com", password: "otra-clave" })).rejects.toThrow(
      new AuthenticationError("Correo o contraseña incorrectos")
    );
  });

  it("email inexistente → mismo error y TAMBIÉN ejecuta bcrypt.compare (anti timing attack)", async () => {
    findUser.mockResolvedValue(null);
    const compare = vi.spyOn(bcrypt, "compare");

    await expect(loginUser({ email: "nadie@mail.com", password })).rejects.toThrow(
      "Correo o contraseña incorrectos"
    );
    // Segunda llamada: reutiliza el hash señuelo ya calculado.
    await expect(loginUser({ email: "nadie@mail.com", password })).rejects.toBeInstanceOf(
      AuthenticationError
    );
    expect(compare).toHaveBeenCalledTimes(2);
  });
});
