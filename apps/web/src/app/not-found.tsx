// App-wide 404 page. Our own so it uses the shared styles (Next's default injects inline
// styles, which the production CSP blocks).
import { Notice } from '@/components/notice';
import { PageShell } from '@/components/page-shell';
import { routes } from '@/routes';

export default function NotFound() {
  return (
    <PageShell>
      <Notice
        title="We couldn’t find that page"
        action={{ href: routes.home(), label: 'Back to search' }}
      >
        The link may be wrong, or the league may not exist for that season.
      </Notice>
    </PageShell>
  );
}
