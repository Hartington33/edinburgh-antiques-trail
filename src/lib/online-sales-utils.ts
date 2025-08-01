import { getDb } from './db';
import { OnlineSalesLink } from './data-utils';

// Functions for managing online sales links
export async function getOnlineSalesLinksByPlaceId(placeId: number): Promise<OnlineSalesLink[]> {
  const db = await getDb();
  return db.all(
    `SELECT * FROM online_sales_links WHERE place_id = ? ORDER BY platform_name ASC`,
    [placeId]
  ) as Promise<OnlineSalesLink[]>;
}

export async function createOnlineSalesLink(link: OnlineSalesLink): Promise<number> {
  const db = await getDb();
  const result = await db.run(
    `INSERT INTO online_sales_links 
     (place_id, platform_name, url, description) 
     VALUES (?, ?, ?, ?)`,
    [
      link.place_id,
      link.platform_name,
      link.url,
      link.description
    ]
  );
  return result.lastID || 0;
}

export async function updateOnlineSalesLink(id: number, link: Partial<OnlineSalesLink>): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: any[] = [];

  // Only update fields that are provided
  if (link.platform_name !== undefined) {
    fields.push('platform_name = ?');
    values.push(link.platform_name);
  }
  if (link.url !== undefined) {
    fields.push('url = ?');
    values.push(link.url);
  }
  if (link.description !== undefined) {
    fields.push('description = ?');
    values.push(link.description);
  }

  if (fields.length === 0) return; // Nothing to update

  values.push(id); // Add id for WHERE clause

  await db.run(
    `UPDATE online_sales_links SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deleteOnlineSalesLink(id: number): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM online_sales_links WHERE id = ?', [id]);
}

export async function deleteAllOnlineSalesLinksForPlace(placeId: number): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM online_sales_links WHERE place_id = ?', [placeId]);
}

export async function bulkCreateOnlineSalesLinks(links: OnlineSalesLink[]): Promise<void> {
  const db = await getDb();
  
  // Use a transaction for better performance and atomicity
  await db.exec('BEGIN TRANSACTION');
  
  try {
    const stmt = await db.prepare(
      `INSERT INTO online_sales_links 
       (place_id, platform_name, url, description) 
       VALUES (?, ?, ?, ?)`
    );

    for (const link of links) {
      await stmt.run([
        link.place_id,
        link.platform_name,
        link.url,
        link.description
      ]);
    }

    await stmt.finalize();
    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

// Get platform icon class for common platforms
export function getPlatformIconClass(platformName: string): string {
  const name = platformName.toLowerCase();
  
  if (name.includes('ebay')) return 'fa-brands fa-ebay';
  if (name.includes('etsy')) return 'fa-brands fa-etsy';
  if (name.includes('amazon')) return 'fa-brands fa-amazon';
  if (name.includes('instagram')) return 'fa-brands fa-instagram';
  if (name.includes('facebook')) return 'fa-brands fa-facebook';
  if (name.includes('vinted')) return 'fa-solid fa-tag';
  if (name.includes('pinterest')) return 'fa-brands fa-pinterest';
  if (name.includes('tiktok')) return 'fa-brands fa-tiktok';
  if (name.includes('shopify')) return 'fa-brands fa-shopify';
  if (name.includes('twitter') || name.includes('x.com')) return 'fa-brands fa-twitter';
  
  // Default icon for other platforms
  return 'fa-solid fa-shopping-cart';
}

// Common marketplace platforms
export const COMMON_PLATFORMS = [
  'eBay',
  'Etsy',
  'Amazon',
  'Vinted',
  'Facebook Marketplace',
  'Instagram Shop',
  'Own Website',
  'Shopify',
  'Other'
];

// Get a well-formatted URL (ensure it starts with http/https)
export function formatUrl(url: string): string {
  if (!url) return '';
  
  // If URL doesn't start with http:// or https://, add https://
  if (!url.match(/^https?:\/\//i)) {
    return `https://${url}`;
  }
  
  return url;
}

// Extract domain name from URL for display
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(formatUrl(url));
    return urlObj.hostname.replace(/^www\./, '');
  } catch (error) {
    // If URL is invalid, return the original
    return url;
  }
}
