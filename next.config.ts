import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["bcryptjs", "mysql2", "exceljs"],

  // TS/ESLint выносим из production-сборки — оба запускаются:
  //  · локально в pre-commit / при `npm run typecheck`
  //  · в CI отдельным шагом перед docker build
  // Это экономит ~10 минут на сервере (и убирает retry-зацикливание TS-воркеров на больших файлах).
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
