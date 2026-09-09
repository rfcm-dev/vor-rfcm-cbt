import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

// Shared PDF styling — same brand palette as the web app, kept simple since
// @react-pdf/renderer only supports a subset of CSS.
const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 11, fontFamily: "Helvetica", color: "#1C1A17" },
  header: { textAlign: "center", marginBottom: 20, borderBottom: "2px solid #C41E2B", paddingBottom: 12 },
  churchName: { fontSize: 10, color: "#C41E2B", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" },
  title: { fontSize: 18, fontWeight: 700, marginTop: 4 },
  subtitle: { fontSize: 10, color: "#666", marginTop: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  label: { fontSize: 9, color: "#666", textTransform: "uppercase" },
  value: { fontSize: 12, fontWeight: 700 },
  questionBlock: { marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid #eee" },
  questionText: { fontWeight: 700, marginBottom: 4 },
  answerText: { color: "#333", marginBottom: 2 },
  correctText: { color: "#2E7D32", fontSize: 10 },
  scoreBox: { alignItems: "center", marginVertical: 20 },
  scoreNumber: { fontSize: 40, fontWeight: 700, color: "#C41E2B" },
  gradeLetter: { fontSize: 16, color: "#1C1A17", marginTop: 2 },
  footer: { position: "absolute", bottom: 24, left: 36, right: 36, textAlign: "center", fontSize: 8, color: "#999" },
});

function Footer() {
  return (
    <Text style={styles.footer} fixed>
      Reconciled Family of Christ Mission — RFCM CBT · Designed and developed by RFCM IT Department @2026
    </Text>
  );
}

export function WorksheetDocument({
  studentName,
  className,
  testTitle,
  answers,
}: {
  studentName: string;
  className: string;
  testTitle: string;
  answers: { content: string; type: string; response: string | null; correct_answer: string | null; auto_score: number | null; manual_score: number | null; points: number }[];
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.churchName}>Reconciled Family of Christ Mission</Text>
          <Text style={styles.title}>{testTitle}</Text>
          <Text style={styles.subtitle}>Exam Worksheet</Text>
        </View>

        <View style={styles.row}>
          <View><Text style={styles.label}>Student</Text><Text style={styles.value}>{studentName}</Text></View>
          <View><Text style={styles.label}>Class</Text><Text style={styles.value}>{className}</Text></View>
        </View>

        {answers.map((a, i) => (
          <View key={i} style={styles.questionBlock} wrap={false}>
            <Text style={styles.questionText}>{i + 1}. {a.content}</Text>
            <Text style={styles.answerText}>Answer: {a.response || "(no answer given)"}</Text>
            {a.type !== "essay" && a.correct_answer && (
              <Text style={styles.correctText}>Correct answer: {a.correct_answer}</Text>
            )}
            <Text style={styles.correctText}>
              Score: {a.manual_score ?? a.auto_score ?? "pending"} / {a.points}
            </Text>
          </View>
        ))}
        <Footer />
      </Page>
    </Document>
  );
}

export function ResultDocument({
  studentName,
  className,
  testTitle,
  percentage,
  grade,
  releasedAt,
}: {
  studentName: string;
  className: string;
  testTitle: string;
  percentage: number;
  grade: string;
  releasedAt: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.churchName}>Reconciled Family of Christ Mission</Text>
          <Text style={styles.title}>{testTitle}</Text>
          <Text style={styles.subtitle}>Result Summary</Text>
        </View>

        <View style={styles.row}>
          <View><Text style={styles.label}>Student</Text><Text style={styles.value}>{studentName}</Text></View>
          <View><Text style={styles.label}>Class</Text><Text style={styles.value}>{className}</Text></View>
        </View>

        <View style={styles.scoreBox}>
          <Text style={styles.scoreNumber}>{percentage}%</Text>
          <Text style={styles.gradeLetter}>Grade {grade}</Text>
        </View>

        <View style={styles.row}>
          <View><Text style={styles.label}>Status</Text><Text style={styles.value}>Released</Text></View>
          <View><Text style={styles.label}>Released</Text><Text style={styles.value}>{releasedAt}</Text></View>
        </View>
        <Footer />
      </Page>
    </Document>
  );
}
