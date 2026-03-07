import { PDFDocument } from 'pdf-lib'

export async function mergePDFs(pdfBuffers: Uint8Array[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create()

  for (const buffer of pdfBuffers) {
    const pdf = await PDFDocument.load(buffer)
    const pages = await merged.copyPages(pdf, pdf.getPageIndices())
    for (const page of pages) {
      merged.addPage(page)
    }
  }

  return merged.save()
}
