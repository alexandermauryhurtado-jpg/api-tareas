import { beforeEach, describe, expect, it, vi } from "vitest";
import { pool } from "../../../src/config/database.js";
import { isUniqueViolation } from "../../../src/persistence/pg-errors.js";
import { createUser, findUserByEmail } from "../../../src/persistence/user.repository.js";
import { buildUser } from "../../helpers/fixtures.js";

vi.mock("../../../src/config/database.js", () => ({ pool: { query: vi.fn() } }));

const query = vi.mocked(pool.query) as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => query.mockReset());

describe("user.repository", () => {
  it("findUserByEmail usa consulta parametrizada", async () => {
    const user = buildUser();
    query.mockResolvedValueOnce({ rows: [user] });

    await expect(findUserByEmail("ana@mail.com")).resolves.toBe(user);
    expect(query.mock.calls[0]?.[0]).toContain("WHERE email = $1");
    expect(query.mock.calls[0]?.[1]).toEqual(["ana@mail.com"]);
  });

  it("findUserByEmail devuelve null si no existe", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    await expect(findUserByEmail("x@x.com")).resolves.toBeNull();
  });

  it("createUser inserta nombre, email y hash", async () => {
    const user = buildUser();
    query.mockResolvedValueOnce({ rows: [user] });

    await expect(
      createUser({ nombre: "Ana", email: "ana@mail.com", passwordHash: "hash" })
    ).resolves.toBe(user);
    expect(query.mock.calls[0]?.[1]).toEqual(["Ana", "ana@mail.com", "hash"]);
  });
});

describe("isUniqueViolation", () => {
  it.each([
    [{ code: "23505" }, true],
    [{ code: "23503" }, false],
    [new Error("x"), false],
    [null, false],
    ["23505", false]
  ])("%o → %s", (error, expected) => {
    expect(isUniqueViolation(error)).toBe(expected);
  });
});
