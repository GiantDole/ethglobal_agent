import supabaseClient from '../database/supabase';

export const getAllProjects = async () => {
    const { data, error } = await supabaseClient.from('tokens').select('*');
    if (error) throw new Error(error.message);
    return data;
};

export const getProjectById = async (id: string) => {
    const { data, error } = await supabaseClient.from('tokens').select('*').eq('id', id).single();
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
