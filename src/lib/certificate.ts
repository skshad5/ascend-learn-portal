import { jsPDF } from "jspdf";

export interface CertificateData {
  studentName: string;
  courseTitle: string;
  instructorName: string;
  completionDate: Date;
}

export function generateCertificate({
  studentName,
  courseTitle,
  instructorName,
  completionDate,
}: CertificateData) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const center = pageWidth / 2;

  // Background
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Inner border
  doc.setDrawColor(99, 102, 241); // indigo
  doc.setLineWidth(2);
  doc.rect(28, 28, pageWidth - 56, pageHeight - 56);
  doc.setLineWidth(0.5);
  doc.rect(40, 40, pageWidth - 80, pageHeight - 80);

  // Header
  doc.setTextColor(199, 210, 254);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("LUMEN ACADEMY", center, 90, { align: "center" });

  doc.setFontSize(36);
  doc.setTextColor(255, 255, 255);
  doc.text("Certificate of Completion", center, 150, { align: "center" });

  // Decorative rule
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(1);
  doc.line(center - 80, 170, center + 80, 170);

  // Body
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(203, 213, 225);
  doc.text("This is proudly presented to", center, 215, { align: "center" });

  // Student name
  doc.setFont("times", "bolditalic");
  doc.setFontSize(42);
  doc.setTextColor(255, 255, 255);
  doc.text(studentName, center, 275, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(203, 213, 225);
  doc.text("for successfully completing the course", center, 315, { align: "center" });

  // Course title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(199, 210, 254);
  const wrapped = doc.splitTextToSize(courseTitle, pageWidth - 180);
  doc.text(wrapped, center, 360, { align: "center" });

  // Footer signatures
  const footerY = pageHeight - 100;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);
  doc.line(120, footerY, 280, footerY);
  doc.line(pageWidth - 280, footerY, pageWidth - 120, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(instructorName, 200, footerY + 18, { align: "center" });
  doc.text(completionDate.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }), pageWidth - 200, footerY + 18, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text("Instructor", 200, footerY + 34, { align: "center" });
  doc.text("Date Issued", pageWidth - 200, footerY + 34, { align: "center" });

  const safe = courseTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`certificate-${safe}.pdf`);
}
