"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, BrainCircuit, Lightbulb } from "lucide-react";

export default function MindMapPage() {
    const userProfile = useQuery(api.users.getMyUserProfile);

    // Loading state while fetching data
    if (userProfile === undefined) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <BrainCircuit className="h-12 w-12 animate-pulse text-blue-500" />
                <p className="mt-4 text-lg">Loading your cognitive profile...</p>
            </div>
        );
    }

    // State for when no insights have been generated yet
    if (!userProfile || (!userProfile.longTermProfileSummary && !userProfile.keyInsights)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
                <BrainCircuit className="h-12 w-12 text-gray-400" />
                <h1 className="mt-4 text-2xl font-bold">Your Cognitive Mind Profile is Being Built</h1>
                <p className="mt-2 text-gray-600">
                    Have a conversation with the AI therapist first. After you end a session, your profile and key insights will appear here.
                </p>
                <Button asChild className="mt-6">
                    <Link href="/dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <BrainCircuit className="h-10 w-10 text-blue-600" />
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-gray-100">
                            Your Cognitive Mind
                        </h1>
                    </div>
                    <Button asChild variant="outline">
                        <Link href="/dashboard">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Dashboard
                        </Link>
                    </Button>
                </header>

                {/* Long-Term Profile Summary Card */}
                {userProfile.longTermProfileSummary && (
                    <Card className="mb-8 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-2xl">Long-Term Profile Summary</CardTitle>
                            <CardDescription>
                                This is the AI's clinical understanding of your cognitive and emotional patterns over time.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                                {userProfile.longTermProfileSummary}
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Key Insights Section */}
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-4 flex items-center gap-2">
                        <Lightbulb className="h-8 w-8 text-yellow-500" />
                        Key Insights
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {userProfile.keyInsights?.map((insight, index) => (
                            <Card key={index} className="flex flex-col">
                                <CardHeader>
                                    <CardTitle className="text-lg">Core Belief</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className="font-semibold text-blue-700 dark:text-blue-400 mb-4">"{insight.belief}"</p>
                                    <h4 className="font-semibold text-sm mb-1">Trigger</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{insight.trigger}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}