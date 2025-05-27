"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Circle, Hourglass, SkipForward, BookOpen, Brain, Sparkles, ClipboardList } from "lucide-react";
import { Doc, Id } from "@/convex/_generated/dataModel";

// Helper to get an icon for each task type
const typeToIcon: Record<string, JSX.Element> = {
    "journal_prompt": <BookOpen className="h-5 w-5 text-brown-500" />,
    "mindfulness_exercise": <Sparkles className="h-5 w-5 text-purple-500" />,
    "reflection_question": <Brain className="h-5 w-5 text-blue-500" />,
    "default": <ClipboardList className="h-5 w-5 text-gray-500" />,
};

export default function PlannerPage() {
    const plannerEntries = useQuery(api.planner.getMyPlannerEntries);
    const updateStatus = useMutation(api.planner.updatePlannerEntryStatus);

    const handleUpdateStatus = (id: Id<"plannerEntries">, status: "in_progress" | "completed" | "skipped") => {
        updateStatus({ plannerEntryId: id, status });
    };

    const groupedEntries = {
        in_progress: plannerEntries?.filter(e => e.status === "in_progress") ?? [],
        pending: plannerEntries?.filter(e => e.status === 'pending') ?? [],
        completed: plannerEntries?.filter(e => e.status === 'completed') ?? [],
        skipped: plannerEntries?.filter(e => e.status === 'skipped') ?? [],
    };

    const renderEntryCard = (entry: Doc<"plannerEntries">) => (
        <Card key={entry._id} className="shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {typeToIcon[entry.type] || typeToIcon["default"]}
                    {entry.title}
                </CardTitle>
                <CardDescription>{entry.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-end gap-2">
                {entry.status === "pending" && (
                    <Button onClick={() => handleUpdateStatus(entry._id, "in_progress")} size="sm">Start</Button>
                )}
                {entry.status === "in_progress" && (
                    <Button onClick={() => handleUpdateStatus(entry._id, "completed")} size="sm" variant="default" className="bg-green-600 hover:bg-green-700">
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Complete
                    </Button>
                )}
                {entry.status !== "completed" && entry.status !== "skipped" && (
                     <Button onClick={() => handleUpdateStatus(entry._id, "skipped")} size="sm" variant="ghost">Skip</Button>
                )}
            </CardContent>
        </Card>
    );

    const renderSection = (title: string, entries: Doc<"plannerEntries">[], icon: JSX.Element) => {
        if (entries.length === 0) return null;
        return (
            <div className="mb-10">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    {icon} {title}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {entries.map(renderEntryCard)}
                </div>
            </div>
        );
    };

    if (plannerEntries === undefined) {
        return <div className="flex justify-center items-center min-h-screen">Loading Planner...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex items-center justify-between mb-8">
                    <h1 className="text-4xl font-bold">My AI Planner</h1>
                    <Button asChild variant="outline">
                        <Link href="/dashboard">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Dashboard
                        </Link>
                    </Button>
                </header>
                
                {plannerEntries.length === 0 ? (
                    <div className="text-center py-16">
                        <h2 className="text-2xl font-semibold">Your planner is empty.</h2>
                        <p className="mt-2 text-gray-600">Complete a session with the AI therapist to get personalized activities.</p>
                    </div>
                ) : (
                    <>
                        {renderSection("In Progress", groupedEntries.in_progress, <Hourglass className="h-6 w-6 text-orange-500" />)}
                        {renderSection("Pending Activities", groupedEntries.pending, <Circle className="h-6 w-6 text-gray-500" />)}
                        {renderSection("Completed", groupedEntries.completed, <CheckCircle2 className="h-6 w-6 text-green-500" />)}
                        {renderSection("Skipped", groupedEntries.skipped, <SkipForward className="h-6 w-6 text-red-500" />)}
                    </>
                )}
            </div>
        </div>
    );
}