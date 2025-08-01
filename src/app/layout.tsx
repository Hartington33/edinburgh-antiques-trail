import './global.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Header from '@/components/Header';
import Providers from './Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Edinburgh Antiques Trail',
  description: 'Digital guide to antique shops, auction houses, book shops, and more in Edinburgh',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Font Awesome for icons */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css"
          integrity="sha512-z3gLpd7yknf1YoNbCzqRKc4qyor8gaKU1qmn+CShxbuBusANI9QpRohGBreCFkKxLhei6S9CQXFEbbKuqLg0DA=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        {/* Temporary Tailwind CSS CDN for styling fix */}
        <link 
          href="https://cdn.jsdelivr.net/npm/tailwindcss@3.3.3/dist/tailwind.min.css" 
          rel="stylesheet"
        />
        {/* Fix leading zeros script */}
        <script dangerouslySetInnerHTML={{ __html: `
          // Run after DOM is loaded
          document.addEventListener('DOMContentLoaded', function() {
            // Helper function to clean times with leading zeros
            function cleanTimeDisplay(text) {
              if (!text) return text;
              
              // Handle special cases
              if (text.toLowerCase().includes('appointment')) {
                return text.replace(/^0+/g, ''); // Remove any leading zeros
              }
              
              if (text.toLowerCase().includes('closed')) {
                return text.replace(/^0+/g, ''); // Remove any leading zeros
              }
              
              // Remove leading zeros from times in formats like 09:00
              return text.replace(/\b0+(\d)/g, '$1');
            }
            
            // Process all text nodes to remove leading zeros
            function processNode(node) {
              if (node.nodeType === 3) { // Text node
                // Check if text contains problematic patterns
                if (node.textContent && (
                  node.textContent.match(/\b0\d/) || 
                  node.textContent.match(/0By appointment/) ||
                  node.textContent.match(/00By appointment/)
                )) {
                  node.textContent = cleanTimeDisplay(node.textContent);
                }
              } else if (node.nodeType === 1) { // Element node
                // Process children
                Array.from(node.childNodes).forEach(child => {
                  processNode(child);
                });
              }
            }
            
            // Process the entire document
            processNode(document.body);
            
            // Set up observer to handle dynamically added content
            const observer = new MutationObserver(mutations => {
              mutations.forEach(mutation => {
                if (mutation.addedNodes.length) {
                  mutation.addedNodes.forEach(node => {
                    processNode(node);
                  });
                }
              });
            });
            
            // Start observing
            observer.observe(document.body, {
              childList: true,
              subtree: true
            });
          });
        `}} />
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --edinburgh-blue: #1D3557;
            --edinburgh-stone: #D6CFC7;
            --antique-gold: #C29B40;
          }
          
          .bg-edinburgh-blue {
            background-color: var(--edinburgh-blue);
          }
          
          .text-edinburgh-blue {
            color: var(--edinburgh-blue);
          }
          
          .bg-edinburgh-stone {
            background-color: var(--edinburgh-stone);
          }
          
          .bg-antique-gold {
            background-color: var(--antique-gold);
          }
          
          .text-antique-gold {
            color: var(--antique-gold);
          }
          
          .border-edinburgh-blue {
            border-color: var(--edinburgh-blue);
          }
          
          .border-edinburgh-stone {
            border-color: var(--edinburgh-stone);
          }
          
          .card {
            background-color: white;
            padding: 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
        ` }} />
      </head>
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Header />
            <div className="flex-1">
              <main className="container mx-auto p-6 md:p-8">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
