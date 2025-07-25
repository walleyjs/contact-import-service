import { createClient } from "@supabase/supabase-js";
import type { Task } from "graphile-worker";

interface ImportJobPayload {
	jobId: string;
	source: string;
}

interface Contact {
	name: string;
	email: string;
	source: string;
}

interface ProcessedContact {
	id: string;
	name: string;
	email: string;
	source: string;
	imported_at: string;
}

const supabase = createClient(
	process.env.SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const processImportJob: Task = async (payload, { logger }) => {
	const { jobId, source } = payload as ImportJobPayload;
	logger.info(`Starting import job ${jobId} from source: ${source}`);

	const filePath = `imports/${jobId}.json`;

	const { data: file, error: downloadError } = await supabase.storage
		.from("imports")
		.download(filePath);

	if (downloadError || !file) {
		logger.error(`Failed to download file: ${downloadError?.message}`);
		throw new Error("Failed to download import file");
	}

	const text = await file.text();
	let contacts: Contact[];
	try {
		contacts = JSON.parse(text);
	} catch (e) {
		console.log("processerr", e)
		logger.error("Failed to parse contacts JSON");
		throw new Error("Invalid contacts JSON");
	}

	const rows = contacts.map((contact) => ({
		name: contact.name,
		email: contact.email,
		source,
	}));

	const { error: insertError } = await supabase.from("contacts").insert(rows);

	if (insertError) {
		logger.error(`Failed to insert contacts: ${insertError.message}`);
		throw new Error("Failed to insert contacts");
	}

	logger.info(`Successfully imported ${rows.length} contacts for job ${jobId}`);
};

export default processImportJob;
