"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const KOSONG = {
  name: "",
  description: "",
  capacity: "2",
  price: "",
};

function rupiah(value) {
  const angka = Number(value ?? 0);
  if (!Number.isFinite(angka)) return "Rp0";

  return (
    "Rp" +
    new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: 0,
      useGrouping: true,
    }).format(Math.round(angka))
  );
}

function statusKamar(status) {
  const daftar = {
    TERSEDIA: ["Tersedia", "#E4F3E7", "#276738"],
    TERISI: ["Terisi", "#FBE5D9", "#9A4B25"],
    DIBERSIHKAN: ["Dibersihkan", "#FFF0C9", "#886515"],
    PERBAIKAN: ["Perbaikan", "#F8DDE0", "#A12D3A"],
  };

  return daftar[status] || [
    status || "Tidak diketahui",
    "#EEEEEE",
    "#555555",
  ];
}

export default function AdminPage() {
  const [roomTypes, setRoomTypes] = useState([]);

  const [roomNumber, setRoomNumber] = useState("");
  const [floor, setFloor] = useState("1");
  const [roomTypeId, setRoomTypeId] = useState("");
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [savingRoom, setSavingRoom] = useState(false);
  const [roomFormError, setRoomFormError] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(KOSONG);
  const [showForm, setShowForm] = useState(false);

  const loadRoomTypes = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/room-types", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal mengambil data tipe kamar."
        );
      }

      setRoomTypes(result.data || []);
      setError("");
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat memuat data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
  let isActive = true;

  Promise.resolve().then(() => {
    if (isActive) {
      loadRoomTypes();
    }
  });

  return () => {
    isActive = false;
  };
}, [loadRoomTypes]);

  const semuaKamar = roomTypes.flatMap((type) =>
    (type.rooms || []).map((room) => ({
      ...room,
      roomTypeName: type.name,
    }))
  );

  const totalKamar = semuaKamar.length;

  const kamarTersedia = semuaKamar.filter(
    (room) => room.status === "TERSEDIA"
  ).length;

  const kamarTerisi = semuaKamar.filter(
    (room) => room.status === "TERISI"
  ).length;

  const kamarPerbaikan = semuaKamar.filter(
    (room) => room.status === "PERBAIKAN"
  ).length;

  function bukaTambah() {
    setEditingId(null);
    setForm(KOSONG);
    setFormError("");
    setMessage("");
    setShowForm(true);
  }

  function bukaEdit(type) {
    setEditingId(type.id);
    setForm({
      name: type.name || "",
      description: type.description || "",
      capacity: String(type.capacity),
      price: String(type.price),
    });
    setFormError("");
    setMessage("");
    setShowForm(true);
  }

  function tutupForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(KOSONG);
    setFormError("");
  }

  function bukaFormUnit() {
    setRoomNumber("");
    setFloor("1");
    setRoomTypeId(
      roomTypes.length ? String(roomTypes[0].id) : ""
    );
    setRoomFormError("");
    setMessage("");
    setShowRoomForm(true);
  }

  function tutupFormUnit() {
    setShowRoomForm(false);
    setRoomNumber("");
    setFloor("1");
    setRoomTypeId("");
    setRoomFormError("");
  }

  async function simpanUnitKamar(event) {
    event.preventDefault();
    setRoomFormError("");
    setMessage("");

    if (!roomNumber.trim()) {
      setRoomFormError("Nomor kamar wajib diisi.");
      return;
    }

    if (
      !floor ||
      Number(floor) < 1 ||
      !Number.isInteger(Number(floor))
    ) {
      setRoomFormError(
        "Lantai harus berupa angka bulat minimal 1."
      );
      return;
    }

    if (!roomTypeId) {
      setRoomFormError(
        "Silakan pilih tipe kamar terlebih dahulu."
      );
      return;
    }

    setSavingRoom(true);

    try {
      const response = await fetch("/api/admin/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: roomNumber.trim(),
          floor: Number(floor),
          roomTypeId: Number(roomTypeId),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal menambahkan unit kamar."
        );
      }

      tutupFormUnit();
      setMessage("Unit kamar berhasil ditambahkan.");
      await loadRoomTypes();
    } catch (err) {
      setRoomFormError(err.message || "Terjadi kesalahan.");
    } finally {
      setSavingRoom(false);
    }
  }

  async function simpanTipeKamar(event) {
    event.preventDefault();
    setFormError("");
    setMessage("");

    const capacity = Number(form.capacity);
    const price = Number(form.price);

    if (!form.name.trim()) {
      setFormError("Nama tipe kamar wajib diisi.");
      return;
    }

    if (!Number.isInteger(capacity) || capacity < 1) {
      setFormError(
        "Kapasitas harus berupa angka bulat minimal 1."
      );
      return;
    }

    if (!Number.isSafeInteger(price) || price < 0) {
      setFormError(
        "Tarif harus berupa angka bulat dan tidak boleh negatif."
      );
      return;
    }

    setSaving(true);

    try {
      const url = editingId
        ? `/api/admin/room-types/${editingId}`
        : "/api/admin/room-types";

      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          capacity,
          price,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal menyimpan tipe kamar."
        );
      }

      setMessage(
        editingId
          ? "Tipe kamar berhasil diperbarui."
          : "Tipe kamar berhasil ditambahkan."
      );

      tutupForm();
      await loadRoomTypes();
    } catch (err) {
      setFormError(err.message || "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>NARA HOTEL</p>
          <h1 style={styles.title}>Dashboard Admin</h1>
          <p style={styles.subtitle}>
            Kelola tipe kamar, tarif, dan unit kamar hotel.
          </p>
        </div>

        <Link href="/" style={styles.homeButton}>
          Kembali ke Beranda
        </Link>
      </header>

      <section style={styles.welcome}>
        <div>
          <p style={styles.welcomeSmall}>
            PANEL ADMINISTRATOR
          </p>
          <h2 style={styles.welcomeTitle}>
            Selamat datang di NARA HOTEL
          </h2>
          <p style={styles.welcomeText}>
            Kelola informasi kamar hotel dengan mudah melalui
            halaman ini.
          </p>
        </div>
      </section>

      {message && <p style={styles.success}>{message}</p>}
      {error && <p style={styles.error}>{error}</p>}

      <section style={styles.stats}>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Total Unit Kamar</p>
          <h3 style={styles.statValue}>{totalKamar}</h3>
        </div>

        <div style={styles.statCard}>
          <p style={styles.statLabel}>Kamar Tersedia</p>
          <h3 style={styles.statValue}>{kamarTersedia}</h3>
        </div>

        <div style={styles.statCard}>
          <p style={styles.statLabel}>Kamar Terisi</p>
          <h3 style={styles.statValue}>{kamarTerisi}</h3>
        </div>

        <div style={styles.statCard}>
          <p style={styles.statLabel}>Kamar Perbaikan</p>
          <h3 style={styles.statValue}>{kamarPerbaikan}</h3>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <p style={styles.eyebrow}>
              INFORMASI AKOMODASI
            </p>
            <h2 style={styles.sectionTitle}>
              Tipe Kamar dan Tarif
            </h2>
          </div>

          <button
            type="button"
            style={styles.primaryButton}
            onClick={bukaTambah}
          >
            + Tambah Tipe Kamar
          </button>
        </div>

        <div style={styles.actionRow}>
          <p style={styles.muted}>
            Tambahkan kategori kamar atau unit kamar fisik hotel.
          </p>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={bukaFormUnit}
            disabled={roomTypes.length === 0}
          >
            + Tambah Unit Kamar
          </button>
        </div>

        {loading ? (
          <div style={styles.empty}>Memuat data kamar...</div>
        ) : roomTypes.length === 0 ? (
          <div style={styles.empty}>
            <p>Belum ada tipe kamar.</p>
            <p>
              Buat tipe kamar terlebih dahulu sebelum
              menambahkan unit.
            </p>
          </div>
        ) : (
          <div style={styles.roomGrid}>
            {roomTypes.map((type) => (
              <article key={type.id} style={styles.roomCard}>
                <div style={styles.roomIllustration}>
                  <span style={styles.roomTag}>NARA HOTEL</span>
                </div>

                <div style={styles.roomContent}>
                  <div style={styles.roomTitleRow}>
                    <h3 style={styles.roomName}>{type.name}</h3>

                    <button
                      type="button"
                      style={styles.editButton}
                      onClick={() => bukaEdit(type)}
                    >
                      Edit
                    </button>
                  </div>

                  <p style={styles.roomDescription}>
                    {type.description ||
                      "Belum ada deskripsi tipe kamar."}
                  </p>

                  <div style={styles.roomMeta}>
                    <span>
                      Kapasitas {type.capacity} orang
                    </span>
                  </div>

                  <div style={styles.priceRow}>
                    <span style={styles.priceLabel}>
                      Tarif per malam
                    </span>
                    <strong style={styles.price}>
                      {rupiah(type.price)}
                    </strong>
                  </div>

                  <div style={styles.miniDivider} />

                  <div style={styles.unitHeading}>
                    <strong>Unit Kamar</strong>
                    <span style={styles.muted}>
                      {(type.rooms || []).length} unit
                    </span>
                  </div>

                  {!type.rooms || type.rooms.length === 0 ? (
                    <p style={styles.muted}>
                      Belum ada unit kamar.
                    </p>
                  ) : (
                    <div style={styles.unitList}>
                      {type.rooms.map((room) => {
                        const status = statusKamar(room.status);

                        return (
                          <div
                            key={room.id}
                            style={styles.unitRow}
                          >
                            <span style={styles.unitNumber}>
                              Kamar {room.roomNumber}
                            </span>

                            <span style={styles.unitFloor}>
                              Lantai {room.floor}
                            </span>

                            <span
                              style={{
                                ...styles.statusBadge,
                                background: status[1],
                                color: status[2],
                              }}
                            >
                              {status[0]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {showForm && (
        <div style={styles.modalBackdrop}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="type-form-title"
            style={styles.modal}
          >
            <div style={styles.modalHeader}>
              <div>
                <p style={styles.eyebrow}>
                  PENGELOLAAN AKOMODASI
                </p>
                <h2
                  id="type-form-title"
                  style={styles.modalTitle}
                >
                  {editingId
                    ? "Edit Tipe Kamar"
                    : "Tambah Tipe Kamar"}
                </h2>
              </div>

              <button
                type="button"
                style={styles.closeButton}
                onClick={tutupForm}
                aria-label="Tutup form"
              >
                ×
              </button>
            </div>

            <form onSubmit={simpanTipeKamar}>
              <label style={styles.label}>
                Nama Tipe Kamar
                <input
                  style={styles.input}
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event.target.value,
                    })
                  }
                  placeholder="Contoh: Deluxe Room"
                  required
                />
              </label>

              <label style={styles.label}>
                Deskripsi
                <textarea
                  style={{
                    ...styles.input,
                    minHeight: 90,
                    resize: "vertical",
                  }}
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description: event.target.value,
                    })
                  }
                  placeholder="Deskripsi dan fasilitas kamar"
                />
              </label>

              <div style={styles.formGrid}>
                <label style={styles.label}>
                  Kapasitas Orang
                  <input
                    style={styles.input}
                    type="number"
                    min="1"
                    step="1"
                    value={form.capacity}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        capacity: event.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label style={styles.label}>
                  Tarif per Malam (Rp)
                  <input
                    style={styles.input}
                    type="number"
                    min="0"
                    step="1"
                    value={form.price}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        price: event.target.value,
                      })
                    }
                    placeholder="Contoh: 350000"
                    required
                  />
                </label>
              </div>

              {formError && (
                <p style={styles.formError}>{formError}</p>
              )}

              <div style={styles.formActions}>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={tutupForm}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  style={styles.primaryButton}
                  disabled={saving}
                >
                  {saving
                    ? "Menyimpan..."
                    : "Simpan Tipe Kamar"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showRoomForm && (
        <div style={styles.modalBackdrop}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="room-form-title"
            style={styles.modal}
          >
            <div style={styles.modalHeader}>
              <div>
                <p style={styles.eyebrow}>
                  PENGELOLAAN UNIT KAMAR
                </p>
                <h2
                  id="room-form-title"
                  style={styles.modalTitle}
                >
                  Tambah Unit Kamar
                </h2>
              </div>

              <button
                type="button"
                style={styles.closeButton}
                onClick={tutupFormUnit}
                aria-label="Tutup form"
              >
                ×
              </button>
            </div>

            <form onSubmit={simpanUnitKamar}>
              <label style={styles.label}>
                Nomor Kamar
                <input
                  style={styles.input}
                  value={roomNumber}
                  onChange={(event) =>
                    setRoomNumber(event.target.value)
                  }
                  placeholder="Contoh: 101"
                  required
                />
              </label>

              <label style={styles.label}>
                Lantai
                <input
                  style={styles.input}
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={floor}
                  onChange={(event) =>
                    setFloor(event.target.value)
                  }
                  required
                />
              </label>

              <label style={styles.label}>
                Tipe Kamar
                <select
                  style={styles.input}
                  value={roomTypeId}
                  onChange={(event) =>
                    setRoomTypeId(event.target.value)
                  }
                  required
                >
                  <option value="">Pilih tipe kamar</option>
                  {roomTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} — {rupiah(type.price)} / malam
                    </option>
                  ))}
                </select>
              </label>

              <p style={styles.info}>
                Unit baru akan otomatis berstatus Tersedia.
              </p>

              {roomFormError && (
                <p style={styles.formError}>
                  {roomFormError}
                </p>
              )}

              <div style={styles.formActions}>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={tutupFormUnit}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  style={styles.primaryButton}
                  disabled={savingRoom}
                >
                  {savingRoom
                    ? "Menyimpan..."
                    : "Simpan Unit Kamar"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <footer style={styles.footer}>
        <p>NARA HOTEL · Sistem Informasi Reservasi Hotel</p>
        <p>Panel Pengelolaan Admin</p>
      </footer>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#F8F3EC",
    color: "#45352B",
    padding: "32px 5%",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
    marginBottom: 28,
  },
  eyebrow: {
    margin: "0 0 8px",
    color: "#9A7558",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2,
  },
  title: {
    margin: 0,
    fontSize: 32,
    color: "#493326",
  },
  subtitle: {
    color: "#88776A",
    margin: "8px 0 0",
    lineHeight: 1.6,
  },
  homeButton: {
    display: "inline-block",
    padding: "11px 16px",
    border: "1px solid #D8C6B5",
    borderRadius: 10,
    color: "#654832",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 600,
  },
  welcome: {
    background: "linear-gradient(120deg, #684831, #A9805E)",
    borderRadius: 18,
    padding: "28px 30px",
    color: "#FFF9F2",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    marginBottom: 24,
  },
  welcomeSmall: {
    fontSize: 11,
    letterSpacing: 2,
    margin: "0 0 10px",
    opacity: 0.8,
  },
  welcomeTitle: {
    fontSize: 25,
    margin: "0 0 8px",
  },
  welcomeText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.6,
    opacity: 0.9,
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 16,
    marginBottom: 30,
  },
  statCard: {
    background: "#FFFCF8",
    border: "1px solid #EDE2D7",
    borderRadius: 15,
    padding: 20,
    boxShadow: "0 4px 14px rgba(80, 53, 31, 0.04)",
  },
  statLabel: {
    margin: "0 0 8px",
    color: "#8B7A6D",
    fontSize: 13,
  },
  statValue: {
    margin: 0,
    color: "#60452F",
    fontSize: 28,
  },
  section: {
    background: "#FFFCF8",
    border: "1px solid #EDE2D7",
    borderRadius: 18,
    padding: 24,
    boxShadow: "0 4px 18px rgba(80, 53, 31, 0.04)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    margin: 0,
    color: "#493326",
  },
  primaryButton: {
    background: "#79563C",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 10,
    padding: "12px 17px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  },
  secondaryButton: {
    background: "#F0E4D8",
    color: "#674831",
    border: "1px solid #DCC8B5",
    borderRadius: 10,
    padding: "11px 15px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  },
  actionRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
    padding: "12px 0 22px",
  },
  success: {
    padding: "12px 15px",
    borderRadius: 10,
    color: "#276738",
    background: "#E4F3E7",
    border: "1px solid #C5E4CC",
  },
  info: {
    padding: "12px 14px",
    borderRadius: 10,
    color: "#79563C",
    background: "#F5EBDD",
    fontSize: 13,
    lineHeight: 1.6,
  },
  error: {
    padding: "12px 15px",
    borderRadius: 10,
    color: "#A12D3A",
    background: "#F8DDE0",
    border: "1px solid #EDC2C7",
  },
  empty: {
    padding: 30,
    textAlign: "center",
    border: "1px dashed #DCC8B5",
    borderRadius: 12,
    color: "#8B7A6D",
    lineHeight: 1.7,
  },
  roomGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 20,
  },
  roomCard: {
    border: "1px solid #E8DCCF",
    borderRadius: 15,
    overflow: "hidden",
    background: "#FFFFFF",
  },
  roomIllustration: {
    background: "linear-gradient(135deg, #EAD9C6, #F6EDE2)",
    minHeight: 105,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: "20px 22px",
  },
  roomTag: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: "#79563C",
    fontWeight: 700,
  },
  roomContent: {
    padding: 18,
  },
  roomTitleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  roomName: {
    margin: 0,
    fontSize: 19,
    color: "#493326",
  },
  editButton: {
    border: "1px solid #DCC8B5",
    color: "#79563C",
    background: "#FFF9F2",
    borderRadius: 8,
    padding: "7px 11px",
    cursor: "pointer",
    fontWeight: 600,
  },
  roomDescription: {
    fontSize: 13,
    lineHeight: 1.6,
    color: "#88776A",
    minHeight: 40,
  },
  roomMeta: {
    fontSize: 12,
    color: "#79563C",
    padding: "8px 0",
  },
  priceRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  priceLabel: {
    color: "#88776A",
    fontSize: 12,
  },
  price: {
    fontSize: 16,
    color: "#79563C",
  },
  miniDivider: {
    height: 1,
    background: "#EFE4D9",
    margin: "17px 0",
  },
  unitHeading: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    fontSize: 13,
  },
  muted: {
    color: "#9A8A7D",
    fontSize: 12,
    margin: 0,
  },
  unitList: {
    display: "grid",
    gap: 9,
  },
  unitRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    padding: 10,
    border: "1px solid #F0E5DA",
    borderRadius: 9,
    background: "#FFFCF8",
  },
  unitNumber: {
    fontSize: 12,
    fontWeight: 700,
    color: "#60452F",
  },
  unitFloor: {
    fontSize: 11,
    color: "#88776A",
  },
  statusBadge: {
    borderRadius: 20,
    padding: "5px 9px",
    fontSize: 10,
    fontWeight: 700,
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    background: "rgba(43, 31, 23, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    overflowY: "auto",
  },
  modal: {
    background: "#FFFCF8",
    borderRadius: 18,
    padding: 26,
    width: "100%",
    maxWidth: 540,
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 20px 70px rgba(0,0,0,0.18)",
  },
  modalHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 15,
    marginBottom: 22,
  },
  modalTitle: {
    margin: 0,
    fontSize: 22,
    color: "#493326",
  },
  closeButton: {
    background: "transparent",
    border: "none",
    color: "#79563C",
    fontSize: 28,
    lineHeight: 1,
    cursor: "pointer",
  },
  label: {
    display: "grid",
    gap: 8,
    marginBottom: 16,
    color: "#654832",
    fontSize: 13,
    fontWeight: 700,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #DCC8B5",
    borderRadius: 9,
    padding: "12px 13px",
    background: "#FFFFFF",
    color: "#493326",
    fontSize: 14,
    outlineColor: "#A9805E",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 14,
  },
  formError: {
    color: "#A12D3A",
    background: "#F8DDE0",
    borderRadius: 9,
    padding: "11px 13px",
    fontSize: 13,
    lineHeight: 1.5,
  },
  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 22,
  },
  cancelButton: {
    background: "#F3EAE1",
    color: "#654832",
    border: "1px solid #DCC8B5",
    borderRadius: 10,
    padding: "12px 17px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  },
  footer: {
    textAlign: "center",
    padding: "30px 0 10px",
    color: "#9A8A7D",
    fontSize: 11,
    lineHeight: 1.8,
  },
};