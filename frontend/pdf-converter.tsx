"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Presentation, Upload, UploadIcon, DownloadIcon, CheckCircle, X, Download } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { UploadedFile } from './src/app/types'; // adjust path as needed




export default function Home() {
  const [docxFiles, setDocxFiles] = useState<UploadedFile[]>([])
  const [pptFiles, setPptFiles] = useState<UploadedFile[]>([])
  
 const handleFileUpload = (files: FileList | null, fileType: "docx" | "ppt") => {
  if (!files || files.length === 0) return;
 

  const uploadedFile: UploadedFile = {
    id: crypto.randomUUID(),
    name: files[0].name,
    size: files[0].size,
    type: files[0].type,
    file: files[0]
  };
 
    if (fileType === "docx") {
      setDocxFiles((prev) => [...prev, uploadedFile]);
    } else {
      setPptFiles((prev) => [...prev, uploadedFile]);
    }
  }

  const removeFile = (id: string, fileType: "docx" | "ppt") => {
    if (fileType === "docx") {
      setDocxFiles((prev) => prev.filter((file) => file.id !== id))
    } else {
      setPptFiles((prev) => prev.filter((file) => file.id !== id))
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const FileUploadArea = ({
    fileType,
    acceptedTypes,
    title,
    description,
    icon: Icon,
  }: {
    fileType: "docx" | "ppt"
    acceptedTypes: string
    title: string
    description: string
    icon: any
  }) => (
    <div className="border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50">
      <div className="flex flex-col items-center gap-4">
        <Icon className="h-12 w-12 text-primary" />
        <div>
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-muted-foreground mb-4">{description}</p>
          <input
            type="file"
            accept={acceptedTypes}
            multiple
            onChange={(e) => handleFileUpload(e.target.files,fileType)}
            className="hidden"
            id={`${fileType}-upload`}
          />
          <label htmlFor={`${fileType}-upload`}>
            <Button asChild>
              <span className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Choose Files
              </span>
            </Button>
          </label>
        </div>
      </div>
    </div>
  )
  const convertFileToPDF = async (uploadedFile: UploadedFile, fileType: "docx" | "ppt") => {
    if (!uploadedFile.file) {
      console.error("File property missing in uploadedFile")
      return
    }
  
    const formData = new FormData()
    formData.append("file", uploadedFile.file)
  
    const res = await fetch("https://zemnaye-pdf-converter-backend.onrender.com", {
      method: "POST",
      body: formData,
    })
  
    if (!res.ok) {
      alert("Conversion failed. Please try again.");
      return
    }
  
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = uploadedFile.name.replace(/\.\w+$/, ".pdf")
    a.click()
    
  }
  
  

  const FileList = ({ files, fileType }: { files: UploadedFile[]; fileType: "docx" | "ppt" }) => {
    if (files.length === 0) return null

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-muted-foreground">Processing Files</h4>
        {files.map((file) => (
          <Card key={file.id} className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {fileType === "docx" ? (
                  <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                ) : (
                  <Presentation className="h-8 w-8 text-primary flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="default">Ready</Badge>
                <Button size="sm"  onClick={() => convertFileToPDF(file, fileType)}>
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button variant="ghost" size="icon" onClick={() => removeFile(file.id, fileType)}>
                  <X className="h-4 w-4" />
                </Button>
               
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-accent rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-2xl">Z</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Zemenay</h1>
              <p className="text-sm text-muted-foreground">PDF Converter</p>
            </div>
          </div>
          <h2 className="text-4xl font-bold tracking-tight mb-4">PDF Converter</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Convert your documents and presentations to PDF format quickly and securely.
          </p>
          <div className="mt-4">
            <Badge>Powered by Zemenay</Badge>
          </div>
        </div>

        <div className="max-w-3xl mx-auto">
          <Tabs defaultValue="docx" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="docx">
                <FileText className="h-4 w-4 mr-2" />
                DOCX to PDF
              </TabsTrigger>
              <TabsTrigger value="ppt">
                <Presentation className="h-4 w-4 mr-2" />
                PPT to PDF
              </TabsTrigger>
            </TabsList>

            <TabsContent value="docx" className="space-y-4">
              <FileUploadArea
                fileType="docx"
                acceptedTypes=".docx,.doc"
                title="Convert DOCX to PDF"
                description="Drag and drop your DOCX files here, or click to browse"
                icon={FileText}
              />
              <FileList files={docxFiles} fileType="docx" />
            </TabsContent>

            <TabsContent value="ppt" className="space-y-4">
              <FileUploadArea
                fileType="ppt"
                acceptedTypes=".pptx,.ppt"
                title="Convert PPT to PDF"
                description="Drag and drop your PowerPoint files here, or click to browse"
                icon={Presentation}
              />
              <FileList files={pptFiles} fileType="ppt" />
            </TabsContent>
          </Tabs>

          <div className="mt-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <UploadIcon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Easy Upload</h3>
                <p className="text-sm text-muted-foreground">Drag & drop or click to upload multiple files at once</p>
              </div>
              <div className="text-center">
                <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Fast Conversion</h3>
                <p className="text-sm text-muted-foreground">High-quality PDF conversion in seconds</p>
              </div>
              <div className="text-center">
                <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <DownloadIcon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Instant Download</h3>
                <p className="text-sm text-muted-foreground">Download your converted PDFs immediately</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
