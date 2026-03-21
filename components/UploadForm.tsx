'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { upload } from "@vercel/blob/client";
import { ImageIcon, Upload } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import FileUploader from "@/components/FileUploader";
import LoadingOverlay from "@/components/LoadingOverlay";
import VoiceSelector from "@/components/VoiceSelector";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { checkBookExists, createBook, saveBookSegments } from "@/lib/actions/book.actions";
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_PDF_TYPES,
  DEFAULT_VOICE,
} from "@/lib/constants";
import { parsePDFFile } from "@/lib/utils";
import { UploadSchema } from "@/lib/zod";
import { type BookUploadFormValues } from "@/types";

const UploadForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { userId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const form = useForm<BookUploadFormValues>({
    resolver: zodResolver(UploadSchema),
    defaultValues: {
      title: "",
      author: "",
      persona: "",
      pdfFile: undefined,
      coverImage: undefined,
    },
  });

  const onSubmit = async (data: BookUploadFormValues) => {
    if (!userId) {
      return toast.error("Please login to upload books");
    }

    setIsSubmitting(true);

    try {
      const existsCheck = await checkBookExists(data.title);

      if (existsCheck.exists && existsCheck.book) {
        toast.info("Book with same title already exists.");
        form.reset();
        router.push(`/books/${existsCheck.book.slug}`);
        return;
      }

      const fileTitle = data.title.replace(/\s+/g, "-").toLowerCase();
      const pdfFile = data.pdfFile;
      const parsedPDF = await parsePDFFile(pdfFile);

      if (parsedPDF.content.length === 0) {
        toast.error("Failed to parse PDF. Please try again with a different file.");
        return;
      }

      const uploadedPdfBlob = await upload(fileTitle, pdfFile, {
        access: "public",
        handleUploadUrl: "/api/upload",
        contentType: "application/pdf",
      });

      let coverUrl: string;
      let coverBlobKey: string | undefined;

      if (data.coverImage) {
        const uploadedCoverBlob = await upload(`${fileTitle}_cover.png`, data.coverImage, {
          access: "public",
          handleUploadUrl: "/api/upload",
          contentType: data.coverImage.type,
        });

        coverUrl = uploadedCoverBlob.url;
        coverBlobKey = uploadedCoverBlob.pathname;
      } else {
        const response = await fetch(parsedPDF.cover);
        const blob = await response.blob();
        const uploadedCoverBlob = await upload(`${fileTitle}_cover.png`, blob, {
          access: "public",
          handleUploadUrl: "/api/upload",
          contentType: "image/png",
        });

        coverUrl = uploadedCoverBlob.url;
        coverBlobKey = uploadedCoverBlob.pathname;
      }

      const bookResult = await createBook({
        clerkId: userId,
        title: data.title,
        author: data.author,
        persona: data.persona || DEFAULT_VOICE,
        fileURL: uploadedPdfBlob.url,
        fileBlobKey: uploadedPdfBlob.pathname,
        coverURL: coverUrl,
        coverBlobKey,
        fileSize: pdfFile.size,
      });

      if (!bookResult.success || !bookResult.data) {
        toast.error(bookResult.error?.toString() || "Failed to create book.");
        if (bookResult.isBillingError) {
          router.push("/subscriptions");
        }
        return;
      }

      const segmentsResult = await saveBookSegments(bookResult.data._id, userId, parsedPDF.content);

      if (!segmentsResult.success) {
        toast.error("Book created, but text indexing failed.");
        router.push(`/books/${bookResult.data.slug}`);
        return;
      }

      toast.success("Book added successfully.");
      form.reset();
      router.push(`/books/${bookResult.data.slug}`);
    } catch (error) {
      console.error("Error uploading book:", error);
      toast.error("Failed to upload book. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) {
    return null;
  }

  return (
    <>
      {isSubmitting && <LoadingOverlay />}

      <div className="new-book-wrapper">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FileUploader
              control={form.control}
              name="pdfFile"
              label="Book PDF File"
              acceptTypes={ACCEPTED_PDF_TYPES}
              icon={Upload}
              placeholder="Click to upload PDF"
              hint="PDF file (max 50MB)"
              disabled={isSubmitting}
            />

            <FileUploader
              control={form.control}
              name="coverImage"
              label="Cover Image (Optional)"
              acceptTypes={ACCEPTED_IMAGE_TYPES}
              icon={ImageIcon}
              placeholder="Click to upload cover image"
              hint="Leave empty to auto-generate from PDF"
              disabled={isSubmitting}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="form-label">Title</FormLabel>
                  <FormControl>
                    <Input
                      className="form-input"
                      placeholder="ex: Rich Dad Poor Dad"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="author"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="form-label">Author Name</FormLabel>
                  <FormControl>
                    <Input
                      className="form-input"
                      placeholder="ex: Robert Kiyosaki"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="persona"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="form-label">Choose Assistant Voice</FormLabel>
                  <FormControl>
                    <VoiceSelector
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="form-btn" disabled={isSubmitting}>
              Begin Synthesis
            </Button>
          </form>
        </Form>
      </div>
    </>
  );
};

export default UploadForm;
