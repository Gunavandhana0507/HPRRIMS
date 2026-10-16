import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/ui';

export default function NotFound() {
  return (
    <EmptyState icon={Compass} title="Page not found" action={<Link to="/" className="text-sm font-semibold text-brand-700 hover:underline">Go to your dashboard</Link>}>
      The address you opened does not match any page in HPRRIMS.
    </EmptyState>
  );
}
