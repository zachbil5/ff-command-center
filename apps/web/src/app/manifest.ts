// PWA web app manifest (DESIGN §1: installable on phones). Icons arrive with the visual design.
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fantasy Football Center',
    short_name: 'FF Center',
    description: 'Every fantasy league you play in, in one place.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0e1116',
    theme_color: '#1f7a4d',
  };
}
