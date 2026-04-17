import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE
);

// ✅ CREATE USER (ANTI 429)
app.post("/create-user", verifyAdmin, async (req, res) => {

    const { email, password, name, role } = req.body;

    try {

        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });

        if (error) throw error;

        // insert ke profiles
        await supabase.from("profiles").insert({
            id: data.user.id,
            name,
            role
        });

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});

app.delete("/delete-user/:id", verifyAdmin, async (req, res) => {

    const userId = req.params.id;

    try {

        // ❗ hapus dari auth
        const { error } = await supabase.auth.admin.deleteUser(userId);

        if (error) throw error;

        // ❗ hapus dari profiles (optional tapi disarankan)
        await supabase
            .from("profiles")
            .delete()
            .eq("id", userId);

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});

async function verifyAdmin(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: "No token" });
    }

    const token = authHeader.replace("Bearer ", "");

    try {

        // ✅ verify user dari token
        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data.user) {
            return res.status(401).json({ error: "Invalid token" });
        }

        const userId = data.user.id;

        // ✅ cek role di profiles
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", userId)
            .single();

        if (!profile || profile.role !== "admin") {
            return res.status(403).json({ error: "Forbidden (admin only)" });
        }

        // simpan user ke request
        req.user = data.user;

        next();

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server Running on port", PORT);
});