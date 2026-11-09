
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}

function formatTanggal(value) {
  if (!value) return "-";

  return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString(
    "id-ID",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

export default function LaporanOkupansiPage() {
  const [report, setReport] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const query = params.toString();
      const response = await fetch(
        `/api/admin/reports/occupancy${query ? `?${query}` : ""}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal mengambil laporan okupansi.");
      }

      setReport(result.data);
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat mengambil laporan.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadReport();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadReport]);

  const summary = report?.summary || {};
  const daily = report?.daily || [];
  const roomTypes = report?.roomTypes || [];

  const occupancyRate = Number(summary.occupancyRate || 0);

  const styles = {
    page: {
      minHeight: "100vh",
      background: "#F8F3EA",
      padding: "32px 20px",
      color: "#49382D",
    },
    container: {
      maxWidth: "1150px",
      margin: "0 auto",
    },
    heading: {
      fontSize: "28px",
      fontWeight: "700",
      marginBottom: "8px",
    },
    subtitle: {
      color: "#887568",
      marginBottom: "25px",
    },
    button: {
      display: "inline-block",
      padding: "10px 16px",
      background: "#79543D",
      color: "white",
      borderRadius: "8px",
      textDecoration: "none",
      fontSize: "14px",
      marginBottom: "25px",
    },
    panel: {
      background: "#FFFFFF",
      border: "1px solid #E9DED1",
      borderRadius: "12px",
      padding: "22px",
      marginBottom: "22px",
    },
    cards: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
      gap: "15px",
      marginBottom: "22px",
    },
    card: {
      background: "#FFFFFF",
      border: "1px solid #E9DED1",
      borderRadius: "12px",
      padding: "20px",
    },
    label: {
      color: "#887568",
      fontSize: "14px",
      marginBottom: "10px",
    },
    number: {
      fontSize: "27px",
      fontWeight: "700",
      color: "#65452F",
    },
    input: {
      padding: "10px",
      border: "1px solid #D8C8B8",
      borderRadius: "7px",
      color: "#49382D",
      background: "#FFFFFF",
    },
    primaryButton: {
      padding: "10px 18px",
      border: "none",
      borderRadius: "7px",
      background: "#79543D",
      color: "#FFFFFF",
      cursor: "pointer",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      minWidth: "550px",
      fontSize: "14px",
    },
    th: {
      textAlign: "left",
      padding: "13px 12px",
      background: "#F3EADF",
      borderBottom: "1px solid #E5D7C8",
    },
    td: {
      padding: "13px 12px",
      borderBottom: "1px solid #EEE5DC",
    },
  };

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <Link href="/admin" style={styles.button}>
          ← Kembali ke Dashboard Admin
        </Link>

        <h1 style={styles.heading}>Laporan Okupansi Hotel</h1>
        <p style={styles.subtitle}>
          Ringkasan tingkat keterisian kamar NARA HOTEL berdasarkan periode.
        </p>

        <section style={styles.panel}>
          <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px" }}>
            Filter Periode
          </h2>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              loadReport();
            }}
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              alignItems: "end",
            }}
          >
            <label style={{ display: "grid", gap: "7px", fontSize: "13px" }}>
              Tanggal Mulai
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                style={styles.input}
              />
            </label>

            <label style={{ display: "grid", gap: "7px", fontSize: "13px" }}>
              Tanggal Akhir
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                style={styles.input}
              />
            </label>

            <button type="submit" style={styles.primaryButton}>
              Tampilkan Laporan
            </button>
          </form>
        </section>

        {loading ? (
          <p style={{ padding: "25px 0" }}>Memuat laporan okupansi...</p>
        ) : error ? (
          <section style={styles.panel}>
            <p style={{ color: "#B42318" }}>{error}</p>
            <button
              onClick={loadReport}
              style={{ ...styles.primaryButton, marginTop: "12px" }}
            >
              Coba Lagi
            </button>
          </section>
        ) : report ? (
          <>
            <section style={styles.cards}>
              <div style={styles.card}>
                <p style={styles.label}>Total Kamar</p>
                <p style={styles.number}>
                  {formatRupiah(summary.totalRooms)}
                </p>
              </div>

              <div style={styles.card}>
                <p style={styles.label}>Kamar Terisi</p>
                <p style={styles.number}>
                  {formatRupiah(summary.occupiedRooms)}
                </p>
              </div>

              <div style={styles.card}>
                <p style={styles.label}>Kamar Tersedia</p>
                <p style={styles.number}>
                  {formatRupiah(summary.availableRooms)}
                </p>
              </div>

              <div style={styles.card}>
                <p style={styles.label}>Tingkat Okupansi</p>
                <p style={styles.number}>{occupancyRate}%</p>
              </div>
            </section>

            <section style={styles.panel}>
              <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>
                Tingkat Okupansi
              </h2>

              <div
                style={{
                  height: "15px",
                  background: "#EFE5DA",
                  borderRadius: "20px",
                  overflow: "hidden",
                  marginTop: "15px",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, Math.max(0, occupancyRate))}%`,
                    background: "#A47754",
                    borderRadius: "20px",
                  }}
                />
              </div>

              <p style={{ marginTop: "10px", color: "#887568", fontSize: "13px" }}>
                Periode: {formatTanggal(report.period?.startDate)} –{" "}
                {formatTanggal(report.period?.endDate)}
              </p>
            </section>

            <section style={styles.panel}>
              <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px" }}>
                Okupansi Berdasarkan Tipe Kamar
              </h2>

              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Tipe Kamar</th>
                      <th style={styles.th}>Total Kamar</th>
                      <th style={styles.th}>Kamar Terisi</th>
                      <th style={styles.th}>Okupansi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomTypes.length > 0 ? (
                      roomTypes.map((item, index) => (
  <tr key={item.roomTypeId ?? item.id ?? `${item.name}-${index}`}>
                          <td style={styles.td}>{item.name}</td>
                          <td style={styles.td}>{item.totalRooms}</td>
                          <td style={styles.td}>{item.occupiedRooms}</td>
                          <td style={styles.td}>{item.occupancyRate}%</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td style={styles.td} colSpan={4}>
                          Belum ada data tipe kamar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section style={styles.panel}>
              <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px" }}>
                Rincian Okupansi Harian
              </h2>

              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Tanggal</th>
                      <th style={styles.th}>Total Kamar</th>
                      <th style={styles.th}>Kamar Terisi</th>
                      <th style={styles.th}>Okupansi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.length > 0 ? (
                      daily.map((item) => (
                        <tr key={item.date}>
                          <td style={styles.td}>{formatTanggal(item.date)}</td>
                          <td style={styles.td}>{item.totalRooms}</td>
                          <td style={styles.td}>{item.occupiedRooms}</td>
                          <td style={styles.td}>{item.occupancyRate}%</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td style={styles.td} colSpan={4}>
                          Belum ada data okupansi harian.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
