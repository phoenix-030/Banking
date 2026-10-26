import React from "react";

const DownloadButton = ({ pdfUrl, fileName }) => {
  const handleDownload = () => {
    if (!pdfUrl) {
      alert("PDF not available");
      return;
    }

    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = fileName || "question-paper.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={handleDownload}
      className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
    >
      Download PDF
    </button>
  );
};

export default DownloadButton;