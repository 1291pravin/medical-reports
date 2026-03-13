export interface Document {
  id: string
  familyMemberId: string
  memberName: string
  title: string
  fileUrl: string
  fileType: string
  fileSize: number
  category: string | null
  reportDate: string | null
  isProcessed: boolean
  isApproved: boolean
  createdAt: string
  summary?: string | null
  diagnosis?: string[] | null
}

export interface AIExtraction {
  title?: string
  category: string
  summary: string
  diagnosis: string[]
  medications: {
    name: string
    dosage?: string
    frequency?: string
    duration?: string
    purpose?: string
  }[]
  testValues: {
    name: string
    value: string
    unit?: string
    normalRange?: string
    isAbnormal?: boolean
  }[]
  doctorName?: string
  hospitalName?: string
  reportDate?: string
  keyFindings: string[]
}

export function useDocuments() {
  const documents = useState<Document[]>('documents', () => [])
  const loading = ref(false)

  async function fetchDocuments(params?: {
    memberId?: string
    category?: string
    from?: string
    to?: string
  }) {
    loading.value = true
    try {
      documents.value = await $fetch<Document[]>('/api/documents', {
        query: params,
      })
    } finally {
      loading.value = false
    }
  }

  async function uploadDocument(
    file: File,
    data: { familyMemberId: string; title?: string; reportDate?: string },
  ) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('familyMemberId', data.familyMemberId)
    if (data.title) formData.append('title', data.title)
    if (data.reportDate) formData.append('reportDate', data.reportDate)

    return $fetch<Document>('/api/documents/upload', {
      method: 'POST',
      body: formData,
    })
  }

  async function processDocument(documentId: string, data?: { customInstructions?: string }) {
    return $fetch<{ extraction: AIExtraction }>(
      '/api/ai/process',
      {
        method: 'POST',
        body: {
          documentId,
          ...(data?.customInstructions ? { customInstructions: data.customInstructions } : {}),
        },
      },
    )
  }

  async function deleteDocument(id: string) {
    await $fetch(`/api/documents/${id}`, { method: 'DELETE' })
    await fetchDocuments()
  }

  return {
    documents,
    loading,
    fetchDocuments,
    uploadDocument,
    processDocument,
    deleteDocument,
  }
}
