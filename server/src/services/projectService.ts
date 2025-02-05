import supabaseClient from '../database/supabase';

export const getAllProjects = async () => {
    const { data, error } = await supabaseClient
        .from('Projects')
        .select('id, name, author, short_description, token_ticker');

    if (error) throw new Error(error.message);
    return data;
};

export const getProjectById = async (id: number) => {
    const { data, error } = await supabaseClient
        .from('Projects')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw new Error(error.message);
    return data;
};

/*
export const createToken = async (tokenData: { name: string; symbol: string; supply: number }) => {
    const { data, error } = await supabase.from('tokens').insert([tokenData]).single();
    if (error) throw new Error(error.message);
    return data;
};
*/
