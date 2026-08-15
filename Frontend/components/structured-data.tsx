export function StructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Student Hub",
    "description": "A modern productivity platform for students featuring collaborative notes, task management, real-time chat, and AI assistance.",
    "url": "https://studenthub.app",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      "Collaborative note-taking",
      "Task management",
      "Real-time chat",
      "Study groups",
      "AI assistance",
      "Forum discussions"
    ],
    "author": {
      "@type": "Organization",
      "name": "Student Hub Team"
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}
