"use client";

import { use } from "react";
import ProjectDetailPage from "@/components/projects/project-detail-page";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ProjectDetailPage projectId={Number(id)} />;
}
