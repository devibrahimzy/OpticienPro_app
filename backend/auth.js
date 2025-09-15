const db = require("./db");
const bcrypt = require("bcrypt");

function registerUser(username, password, fullName, role = "vendeur") {
  const hash = bcrypt.hashSync(password, 10);
  try {
    const stmt = db.prepare(
      `INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)`
    );
    const result = stmt.run(username, hash, fullName, role);
    console.log("✅ User registered with ID:", result.lastInsertRowid);
    return { success: true, id: result.lastInsertRowid };
  } catch (err) {
    console.error("Error registering user:", err.message);
    return { success: false, error: err.message };
  }
}

function loginUser(username, password) {
  try {
    const stmt = db.prepare(`SELECT * FROM users WHERE username = ?`);
    const row = stmt.get(username);

    if (!row) return { success: false, message: "User not found" };

    const match = bcrypt.compareSync(password, row.password_hash);
    if (match) return { success: true, user: row };
    else return { success: false, message: "Invalid password" };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// ==================== PASSWORD CHANGE ====================
async function changePassword(userId, currentPassword, newPassword) {
  try {
    const stmt = db.prepare("SELECT password_hash FROM users WHERE id = ?");
    const user = stmt.get(userId);

    if (!user) return { success: false, message: "Utilisateur non trouvé" };

    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) return { success: false, message: "Mot de passe actuel incorrect" };

    const newHash = await bcrypt.hash(newPassword, 10);
    const update = db.prepare("UPDATE users SET password_hash = ? WHERE id = ?");
    update.run(newHash, userId);

    return { success: true, message: "Mot de passe changé avec succès ✅" };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

module.exports = { registerUser, loginUser, changePassword };
