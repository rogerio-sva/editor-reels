import {execFileSync} from 'node:child_process';

export const sh = (cmd, args) => {
  try {
    return execFileSync(cmd, args, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28});
  } catch (e) {
    throw new Error(`${cmd} falhou: ${String(e.stderr || e.message).slice(-2400)}`);
  }
};

export const duracao = (arquivo) =>
  Number(sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arquivo]).trim());

export const sondar = (arquivo) => {
  const j = JSON.parse(sh('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', arquivo]));
  const v = j.streams.find((s) => s.codec_type === 'video');
  const rot = Number(v?.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? v?.tags?.rotate ?? 0);
  return {
    codec: v?.codec_name ?? '',
    largura: v?.width ?? 0,
    altura: v?.height ?? 0,
    rotacao: rot,
    temAudio: j.streams.some((s) => s.codec_type === 'audio'),
  };
};
