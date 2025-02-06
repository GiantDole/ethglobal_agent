"use client";

import { useState, useEffect } from "react";
import Link from 'next/link';
import ProjectClient from "../clients/Projects";

type Token = {
  id: number;
  name: string;
  short_description: string;
  token_ticker: string | null;
  token_address: string | null;
  author: string;
  status: number;
  created_at: string;
};

const projectClient = new ProjectClient(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

export default function Page() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const data = await projectClient.getAll();
        if (data) {
          setTokens(data);
        }
      } catch (err) {
        setError('Failed to fetch tokens');
        console.error('Error fetching tokens:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, []);

  if (loading) {
    return <div className="container mx-auto py-12 px-24">Loading...</div>;
  }

  if (error) {
    return <div className="container mx-auto py-12 px-24 text-red-500">{error}</div>;
  }

  return (
    <main>
      <div className="container mx-auto py-12 px-6 md:px-12 lg:px-24">
        <h1 className="text-4xl font-bold mb-10">Current Events</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tokens.map((token) => (
            <Link key={token.id} href={`/token/${token.id}`}>
              <div className="p-4 border rounded-lg shadow-md cursor-pointer">
                <img 
                  src="/images/avatar.png" 
                  alt={token.name} 
                  className="w-full h-64 object-cover mb-2" 
                />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Created by: {token.author}</span>
                  <span className="text-xl">🔗</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold">{token.name}</h3>
                  <span className="text-lg font-bold">
                    {token.token_ticker ? `$${token.token_ticker}` : 'N/A'}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{token.short_description}</p>
                <p className="text-sm font-semibold">
                  Status: {token.status === 1 ? 'Active' : 'Inactive'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
