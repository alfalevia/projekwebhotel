
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatTanggal(value) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function paymentLabel(status) {
  const labels = {
    LUNAS: "Lunas",
    BELUM_DIBAYAR: "Belum Dibayar",
    MENUNGGU_KONFIRMASI: "Menunggu Konfirmasi",
    DITOLAK: "Ditolak",
  };

  return labels[status] || status || "-";
}

export default function LaporanTransaksiPage() {
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
        `/api/admin/reports/transactions${query ? `?${query}` : ""}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal mengambil laporan transaksi.");
      }

      setReport(result.data);
    } catch (err) {
      setError(err.message || "Terjadi kesalahan.");
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
  const transactions = report?.transactions || [];

  const styles = {
    page: {
      minHeight: "100vh",
      background: "#F8F3EA",
      padding: "32px 20px",
      color: "#49382D",
    },
    container: {
      maxWidth: "1200px",
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
    back: {
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
      fontSize: "23px",
      fontWeight: "700",
      color: "#65452F",
      overflowWrap: "anywhere",
    },
    input: {
      padding: "10px",
      border: "1px solid #D8C8B8",
      borderRadius: "7px",
      color: "#49382D",
      background: "#FFFFFF",
    },
    button: {
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
      minWidth: "750px",
      fontSize: "14px",
    },
    th: {
      textAlign: "left",
      padding: "13px 12px",
      background: "#F3EADF",
      borderBottom: "1px solid #E5D7C8",
      whiteSpace: "nowrap",
    },
    td: {
      padding: "13px 12px",
      borderBottom: "1px solid #EEE5DC",
    },
  };

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <Link href="/admin" style={styles.back}>
          ← Kembali ke Dashboard Admin
        </Link>

        <h1 style={styles.heading}>Laporan Transaksi</h1>
        <p style={styles.subtitle}>
          Ringkasan transaksi dan pembayaran NARA HOTEL.
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

            <button type="submit" style={styles.button}>
              Tampilkan Laporan
            </button>
          </form>
        </section>

        {loading ? (
          <p>Memuat laporan transaksi...</p>
        ) : error ? (
          <section style={styles.panel}>
            <p style={{ color: "#B42318" }}>{error}</p>
            <button
              onClick={loadReport}
              style={{ ...styles.button, marginTop: "12px" }}
            >
              Coba Lagi
            </button>
          </section>
        ) : report ? (
          <>
            <section style={styles.cards}>
              <div style={styles.card}>
                <p style={styles.label}>Total Transaksi</p>
                <p style={styles.number}>
                  {summary.totalTransactions || 0}
                </p>
              </div>

              <div style={styles.card}>
                <p style={styles.label}>Pembayaran Lunas</p>
                <p style={styles.number}>
                  {summary.paidTransactions || 0}
                </p>
              </div>

              <div style={styles.card}>
                <p style={styles.label}>Menunggu Konfirmasi</p>
                <p style={styles.number}>
                  {summary.pendingTransactions || 0}
                </p>
              </div>

              <div style={styles.card}>
                <p style={styles.label}>Belum Dibayar</p>
                <p style={styles.number}>
                  {summary.unpaidTransactions || 0}
                </p>
              </div>

              <div style={styles.card}>
                <p style={styles.label}>Pembayaran Ditolak</p>
                <p style={styles.number}>
                  {summary.rejectedTransactions || 0}
                </p>
              </div>

              <div style={styles.card}>
                <p style={styles.label}>Total Pendapatan</p>
                <p style={styles.number}>
                  {formatRupiah(summary.totalRevenue)}
                </p>
              </div>
            </section>

            <section style={styles.panel}>
              <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>
                Ringkasan Pendapatan Harian
              </h2>

              <p style={{ color: "#887568", fontSize: "13px", marginBottom: "16px" }}>
                Periode: {formatTanggal(report.period?.startDate)} –{" "}
                {formatTanggal(report.period?.endDate)}
              </p>

              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Tanggal</th>
                      <th style={styles.th}>Total Transaksi</th>
                      <th style={styles.th}>Transaksi Lunas</th>
                      <th style={styles.th}>Pendapatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.length > 0 ? (
                      daily.map((item, index) => (
                        <tr key={item.date || index}>
                          <td style={styles.td}>{formatTanggal(item.date)}</td>
                          <td style={styles.td}>{item.totalTransactions}</td>
                          <td style={styles.td}>{item.paidTransactions}</td>
                          <td style={styles.td}>{formatRupiah(item.revenue)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td style={styles.td} colSpan={4}>
                          Belum ada data transaksi harian.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section style={styles.panel}>
              <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px" }}>
                Rincian Transaksi
              </h2>

              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Kode Booking</th>
                      <th style={styles.th}>Tanggal</th>
                      <th style={styles.th}>Nama Tamu</th>
                      <th style={styles.th}>Kamar</th>
                      <th style={styles.th}>Total</th>
                      <th style={styles.th}>Metode</th>
                      <th style={styles.th}>Status Pembayaran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length > 0 ? (
                      transactions.map((item, index) => (
                        <tr key={item.id ?? index}>
                          <td style={styles.td}>{item.bookingCode}</td>
                          <td style={styles.td}>{formatTanggal(item.date)}</td>
                          <td style={styles.td}>
                            <div>{item.guestName}</div>
                            <small style={{ color: "#887568" }}>
                              {item.guestEmail}
                            </small>
                          </td>
                          <td style={styles.td}>
                            {item.roomNumber} - {item.roomType}
                          </td>
                          <td style={styles.td}>
                            {formatRupiah(item.totalPrice)}
                          </td>
                          <td style={styles.td}>
                            {item.paymentMethod || "-"}
                          </td>
                          <td style={styles.td}>
                            {paymentLabel(item.paymentStatus)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td style={styles.td} colSpan={7}>
                          Belum ada transaksi pada periode ini.
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
