
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

const INITIAL_FORM = {
  name: "",
  email: "",
  phone: "",
  role: "TAMU",
  password: "",
};

const ROLES = [
  { value: "TAMU", label: "Tamu" },
  { value: "RESEPSIONIS", label: "Resepsionis" },
  { value: "HOUSEKEEPING", label: "Housekeeping" },
  { value: "ADMIN", label: "Admin" },
];

const styles = {
  page: {
    minHeight: "100vh",
    background: "#FAF6EF",
    color: "#49382D",
    padding: "32px 20px",
  },
  container: {
    maxWidth: "1100px",
    margin: "0 auto",
  },
  card: {
    background: "#FFFFFF",
    border: "1px solid #E9DED1",
    borderRadius: "14px",
    padding: "22px",
    marginBottom: "22px",
    boxShadow: "0 4px 15px rgba(75, 52, 35, 0.04)",
  },
  button: {
    background: "#79563D",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    padding: "11px 16px",
    cursor: "pointer",
    fontWeight: "600",
  },
  secondaryButton: {
    background: "#F1E8DE",
    color: "#604832",
    border: "none",
    borderRadius: "8px",
    padding: "9px 12px",
    cursor: "pointer",
    fontWeight: "600",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #DCCDBD",
    borderRadius: "8px",
    background: "#FFFEFC",
    color: "#49382D",
    fontSize: "14px",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    marginBottom: "7px",
    color: "#604832",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "700px",
  },
  th: {
    textAlign: "left",
    padding: "13px 12px",
    background: "#F7F1E9",
    color: "#765B45",
    fontSize: "12px",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "14px 12px",
    borderBottom: "1px solid #F0E9E1",
    fontSize: "13px",
    verticalAlign: "middle",
  },
};

function formatDate(date) {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function roleLabel(role) {
  return ROLES.find((item) => item.value === role)?.label || role;
}

export default function ManajemenPenggunaPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal mengambil data pengguna."
        );
      }

      setUsers(result.data || []);
    } catch (error) {
      setMessage(error.message || "Gagal mengambil data pengguna.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Mengambil data awal tanpa memanggil setState langsung di effect.
  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return users;

    return users.filter((user) =>
      [user.name, user.email, user.phone, user.role]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(keyword)
        )
    );
  }, [users, search]);

  const adminCount = users.filter(
    (user) => user.role === "ADMIN"
  ).length;

  const receptionistCount = users.filter(
    (user) => user.role === "RESEPSIONIS"
  ).length;

  const guestCount = users.filter(
    (user) => user.role === "TAMU"
  ).length;

  function openAddForm() {
    setEditingId(null);
    setForm({ ...INITIAL_FORM });
    setMessage("");
    setShowForm(true);
  }

  function openEditForm(user) {
    setEditingId(user.id);
    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "TAMU",
      password: "",
    });
    setMessage("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...INITIAL_FORM });
  }

  function updateForm(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setMessage("");

    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
      };

      if (!editingId || form.password) {
        payload.password = form.password;
      }

      const response = await fetch(
        editingId
          ? `/api/admin/users/${editingId}`
          : "/api/admin/users",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal menyimpan pengguna."
        );
      }

      closeForm();
      setMessage(result.message || "Pengguna berhasil disimpan.");
      setMessageType("success");

      await loadUsers();
    } catch (error) {
      setMessage(error.message || "Terjadi kesalahan.");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user) {
    const confirmed = window.confirm(
      `Yakin ingin menghapus pengguna ${user.name}?`
    );

    if (!confirmed) return;

    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/users/${user.id}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal menghapus pengguna."
        );
      }

      setMessage(result.message || "Pengguna berhasil dihapus.");
      setMessageType("success");

      await loadUsers();
    } catch (error) {
      setMessage(error.message || "Gagal menghapus pengguna.");
      setMessageType("error");
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "28px",
          }}
        >
          <div>
            <Link
              href="/admin"
              style={{
                color: "#896B50",
                textDecoration: "none",
                fontSize: "13px",
                display: "inline-block",
                marginBottom: "14px",
              }}
            >
              ← Kembali ke Dashboard Admin
            </Link>

            <h1 style={{ fontSize: "30px", margin: "0 0 8px" }}>
              Manajemen Pengguna
            </h1>

            <p style={{ color: "#8A7768", margin: 0 }}>
              Kelola akun dan hak akses pengguna NARA HOTEL.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            style={styles.button}
          >
            + Tambah Pengguna
          </button>
        </header>

        {message && (
          <div
            role="alert"
            style={{
              padding: "13px 16px",
              borderRadius: "9px",
              marginBottom: "18px",
              background:
                messageType === "error" ? "#FCE9E5" : "#E8F3E8",
              color:
                messageType === "error" ? "#A33D2D" : "#35663B",
              fontSize: "14px",
            }}
          >
            {message}
          </div>
        )}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: "14px",
            marginBottom: "22px",
          }}
        >
          {[
            { label: "Total Pengguna", value: users.length },
            { label: "Admin", value: adminCount },
            { label: "Resepsionis", value: receptionistCount },
            { label: "Tamu", value: guestCount },
          ].map((item) => (
            <div key={item.label} style={styles.card}>
              <p style={{ color: "#927E6D", fontSize: "13px", margin: "0 0 10px" }}>
                {item.label}
              </p>
              <strong style={{ fontSize: "27px" }}>
                {item.value}
              </strong>
            </div>
          ))}
        </section>

        {showForm && (
          <section style={styles.card}>
            <h2 style={{ fontSize: "19px", margin: "0 0 20px" }}>
              {editingId ? "Edit Pengguna" : "Tambah Pengguna Baru"}
            </h2>

            <form onSubmit={handleSubmit}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "17px",
                }}
              >
                <div>
                  <label style={styles.label} htmlFor="user-name">
                    Nama Lengkap
                  </label>
                  <input
                    id="user-name"
                    style={styles.input}
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    maxLength={100}
                    required
                  />
                </div>

                <div>
                  <label style={styles.label} htmlFor="user-email">
                    Email
                  </label>
                  <input
                    id="user-email"
                    type="email"
                    style={styles.input}
                    value={form.email}
                    onChange={(event) => updateForm("email", event.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={styles.label} htmlFor="user-phone">
                    Nomor Telepon
                  </label>
                  <input
                    id="user-phone"
                    style={styles.input}
                    value={form.phone}
                    onChange={(event) => updateForm("phone", event.target.value)}
                    maxLength={30}
                  />
                </div>

                <div>
                  <label style={styles.label} htmlFor="user-role">
                    Hak Akses
                  </label>
                  <select
                    id="user-role"
                    style={styles.input}
                    value={form.role}
                    onChange={(event) => updateForm("role", event.target.value)}
                  >
                    {ROLES.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={styles.label} htmlFor="user-password">
                    {editingId
                      ? "Password Baru (kosongkan jika tidak diubah)"
                      : "Password"}
                  </label>
                  <input
                    id="user-password"
                    type="password"
                    style={styles.input}
                    value={form.password}
                    onChange={(event) => updateForm("password", event.target.value)}
                    minLength={8}
                    required={!editingId}
                    autoComplete="new-password"
                    placeholder="Minimal 8 karakter"
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "22px" }}>
                <button
                  type="submit"
                  style={styles.button}
                  disabled={saving}
                >
                  {saving ? "Menyimpan..." : "Simpan Pengguna"}
                </button>

                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={closeForm}
                  disabled={saving}
                >
                  Batal
                </button>
              </div>
            </form>
          </section>
        )}

        <section style={styles.card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
              marginBottom: "20px",
            }}
          >
            <h2 style={{ fontSize: "19px", margin: 0 }}>
              Daftar Pengguna
            </h2>

            <input
              aria-label="Cari pengguna"
              placeholder="Cari nama, email, atau role..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ ...styles.input, maxWidth: "300px" }}
            />
          </div>

          {loading ? (
            <p style={{ color: "#927E6D" }}>Memuat data pengguna...</p>
          ) : filteredUsers.length === 0 ? (
            <p style={{ color: "#927E6D" }}>
              {users.length === 0
                ? "Belum ada data pengguna."
                : "Pengguna tidak ditemukan."}
            </p>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Nama</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Telepon</th>
                    <th style={styles.th}>Role</th>
                    <th style={styles.th}>Terdaftar</th>
                    <th style={styles.th}>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td style={styles.td}>
                        <strong>{user.name}</strong>
                      </td>
                      <td style={styles.td}>{user.email}</td>
                      <td style={styles.td}>{user.phone || "-"}</td>
                      <td style={styles.td}>
                        <span
                          style={{
                            display: "inline-block",
                            background: "#F2E8DC",
                            color: "#75563D",
                            borderRadius: "20px",
                            padding: "5px 10px",
                            fontSize: "11px",
                            fontWeight: "600",
                          }}
                        >
                          {roleLabel(user.role)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {formatDate(user.createdAt)}
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: "flex", gap: "7px" }}>
                          <button
                            type="button"
                            style={styles.secondaryButton}
                            onClick={() => openEditForm(user)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(user)}
                            style={{
                              ...styles.secondaryButton,
                              background: "#F9E7E3",
                              color: "#A33D2D",
                            }}
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
