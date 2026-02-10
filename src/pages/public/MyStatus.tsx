import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const MyStatusPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/portal/dashboard', { replace: true });
  }, [navigate]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting to new portal...</p>
      </div>
    </div>
  );
};

export default MyStatusPage;
