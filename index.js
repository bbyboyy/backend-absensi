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
app.post("/create-user", async (req, res) => {

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

app.delete("/delete-user/:id", async (req, res) => {

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

app.listen(3000, () => {
    console.log("Server running on port 3000");
});