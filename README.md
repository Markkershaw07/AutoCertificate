# AutoCertificate

A Next.js application for generating certificate PDFs from templates.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**

   Copy the example environment file:
   ```bash
   copy .env.local.example .env.local
   ```

   Then edit `.env.local` and add your API keys:
   ```
   CLOUDCONVERT_API_KEY=your_actual_api_key_here
   APP_BASE_URL=http://localhost:3000

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

   - CloudConvert API key: https://cloudconvert.com/dashboard/api/v2/keys
   - Supabase credentials: https://supabase.com/dashboard (Project Settings → API)

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**

   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

## Features

- Form-based certificate generation
- DOCX template processing with docxtemplater
- PDF conversion via CloudConvert
- TypeScript support
- Tailwind CSS styling

## Built With

- [Next.js 15](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [docxtemplater](https://docxtemplater.com/) - Document templating
- [CloudConvert](https://cloudconvert.com/) - PDF conversion
- [Supabase](https://supabase.com/) - Storage & database
