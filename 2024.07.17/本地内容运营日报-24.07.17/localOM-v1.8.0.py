# -*- coding: utf-8 -*-
"""
Created on Fri Sep 17 15:02:13 2021

@author: liansiqi
"""

import pandas as pd
import numpy as np
import re
import os
from itertools import compress
import sys
import datetime
import time


countdown = -1
yesterday = (datetime.date.today() + datetime.timedelta(days=countdown)).strftime('%Y-%m-%d')

countdate2 = (datetime.date.today() + datetime.timedelta(days=countdown))


files = os.listdir()
dataXlsx = [re.search('新内容运营日报', x) is not None 
             for x in files]
xlsxfiles = list(compress(files, dataXlsx))
'''
paiban = pd.read_excel("分工-本地104.xlsx",index_col=0)

#对排班表进行清洗，筛选当日排班
paiban.iloc[0,:] = paiban.iloc[0,:].apply(lambda x :x.strftime('%Y-%m-%d'))
paiban = paiban[paiban.index.str.contains('位置|104本地')]
paiban.columns = paiban.iloc[0,:]
paiban = paiban.drop('位置',0)
paiban = paiban[[yesterday]]
paiban['位置'] = paiban.index
paiban = paiban.rename(columns={yesterday:'编辑'})
'''
#2022.9.1修改：更新为分工表模式
paiban1 = pd.read_excel("分工-104本地.xlsx",index_col=0)
paiban1.columns = paiban1.columns.map(lambda x:x.strftime('%Y-%m-%d'))
paiban1 = paiban1[[yesterday]]
paiban1_idx = None
for i in range(paiban1.shape[0]):
    if (paiban1.iloc[i,0] == '年' or paiban1.iloc[i,0] == '休' or paiban1.iloc[i,0] == '假'):
        paiban1_idx=paiban1[(paiban1[yesterday]== '年')|(paiban1[yesterday]== '休')|(paiban1[yesterday]== '假')].index 
    elif (paiban1.iloc[i,0] == 'N'):
        paiban1.iloc[i,0] = '104本地-下午班'
    elif (paiban1.iloc[i,0] == 'D'):
        paiban1.iloc[i,0] = '104本地-早班'
    elif (paiban1.iloc[i,0] == 'Z'):
        paiban1.iloc[i,0] = '104本地-正常班'

if paiban1_idx is None:
    print("None is rest.")
else:
    paiban1=paiban1.drop(paiban1_idx)    
paiban1.columns = ['位置']

if len(xlsxfiles)!=1:
    print("数据源不唯一，请保留唯一数据源！")
else:
    yesterday = (datetime.date.today() + datetime.timedelta(days=-1)).strftime('%Y%m%d')
    fileData = pd.read_excel(xlsxfiles[0],sheet_name='明细')
    fileData = fileData[~(fileData['本地内容区域'].str.contains('江西')==True)].reset_index()
    
    
    
    fileData['入池筛选'] = pd.to_datetime(fileData['入池时间'],errors='coerce').dt.date
    fileData = fileData[(fileData['入池筛选'] == countdate2)]
    #fileData = fileData.loc[fileData['本地内容区域'].str.contains('江西')==False].reset_index()
    #fileDatatest = fileData[fileData['曝光位置-业务位置'] == '置顶下2条-本地编辑内容']
    #fileDatatest = fileData['内容ID'].drop_duplicates()
    #fileDatatest.to_excel("本地ID.xlsx")
    contentData = fileData[['内容ID','标题','权重','曝光量','曝光点击量',
                            '总浏览时长(s)','浏览次数','次均浏览进度',
                            '调性','是否大事件卡片','入池人','入池时间','内容类型',
                            '一级分类','二级分类','曝光位置-业务位置']]
    contentData = contentData[contentData['曝光位置-业务位置'] == '置顶下2条-本地编辑内容']
    contentData['总浏览进度'] = contentData['次均浏览进度']*contentData['浏览次数']
    contentData = contentData.drop(columns='次均浏览进度')
    contentData[['一级分类','二级分类']] = contentData[['一级分类','二级分类']].replace(np.nan,'-')
    
    contentdataSum = contentData.groupby(['内容ID','标题','权重','调性','是否大事件卡片',
                                          '入池人','入池时间','内容类型','一级分类','二级分类']).sum().reset_index()
    
    contentdataSum['曝光点击率'] = (contentdataSum['曝光点击量']/contentdataSum['曝光量']).apply(lambda x:format(x,'.2%'))
    contentdataSum['次均浏览时长(S)'] = contentdataSum['总浏览时长(s)']/contentdataSum['浏览次数']
    contentdataSum['次均浏览进度'] = (contentdataSum['总浏览进度']/contentdataSum['浏览次数']/100).fillna(0).apply(lambda x:format(x,'.2%'))
    
    contentdataSum = contentdataSum.rename(columns={'总浏览时长(s)':'总浏览时长(S)','浏览次数':'浏览量','调性':'内容调性','是否大事件卡片':'是否推大事件'})
    
    content = contentdataSum[['内容ID','标题','权重','曝光量','曝光点击量','曝光点击率','次均浏览时长(S)',
                              '总浏览时长(S)','浏览量','次均浏览进度','内容调性','是否推大事件',
                              '入池人','入池时间','内容类型','一级分类','二级分类']]
    '''
    #新内容运营日报明细标题
    日期	业务池	内容ID	标题	内容类型	
    调性	一级分类	二级分类	是否大事件卡片	是否屏蔽北京	
    入池时间	入池人	移除时间	移除人	发布时间	权重	曝光位置-业务位置	
    本地内容区域	曝光位置-物理位置	曝光量	曝光用户量	曝光点击量	点击用户量	CTR(%)	
    浏览次数	浏览用户量	总浏览时长(s)	次均浏览时长(s)	次均浏览进度	相关视频浏览时长(s)	
    汇总浏览时长	次均总浏览时长(s)-(汇总浏览时长/浏览次数)
    
    #本地运营内容标题
    '内容ID','标题','权重','趋势','曝光量','曝光点击量','曝光点击率','次均浏览时长(S)'	,
    '总浏览时长(S)','浏览量','次均浏览进度','内容调性','是否推大事件',
    '入池人','入池时间','内容类型','一级分类','二级分类'
    '''
    
    
    content['曝光点击量'] = pd.to_numeric(content['曝光点击量'],errors='coerce').fillna(0)
    content['总浏览时长(S)'] = pd.to_numeric(content['总浏览时长(S)'],errors='coerce').fillna(0)
    content['浏览量'] = pd.to_numeric(content['浏览量'],errors='coerce').fillna(0)
    
    # 添加
    content['曝光量'] = pd.to_numeric(content['曝光量'],errors='coerce').fillna(0)
    
    liststr = ['曝光量','曝光点击量','总浏览时长(S)','浏览量']
    
    editorResult = pd.DataFrame(content.groupby(['入池人'])[liststr].sum())
    editorResultCount = pd.DataFrame(content.groupby('入池人')['内容ID'].nunique())
    editorResultCount = editorResultCount.rename(columns={'内容ID':'发布内容数'})
    editorResultCount['编辑'] = editorResultCount.index
    editorResultSum = pd.DataFrame(content[liststr].sum()).T
    editorResultSum.index = pd.Series(['104本地内容整体'])
    editorResultAll = pd.concat([editorResultSum,editorResult],axis=0)
    editorResultAll['次均浏览时长(s)'] = (editorResultAll['总浏览时长(S)']/editorResultAll['浏览量']).fillna(0).round(2)
    editorResultAll['曝光点击率'] = (editorResultAll['曝光点击量']/editorResultAll['曝光量']).fillna(0).apply(lambda x:format(x,'.2%'))
    editorResultAll = editorResultAll[['曝光量','曝光点击量','曝光点击率','次均浏览时长(s)']]
    editorResultAll['编辑'] = editorResultAll.index
    
    #editorResultFinal = pd.merge(editorResultAll, paiban,how="left",on="编辑")
    editorResultFinal = pd.merge(editorResultAll, paiban1,how="left",on="编辑")
    editorResultFinal = pd.merge(editorResultFinal,editorResultCount,how="left",on="编辑")
   
    
    editorResultFinal = editorResultFinal.replace(np.nan,"")
    editorResultFinal = editorResultFinal[['位置','编辑','曝光量','曝光点击量','曝光点击率','次均浏览时长(s)','发布内容数']]
    #5.27新增排序
    
    for i in range(editorResultFinal.shape[0]):
        if editorResultFinal['位置'][i] == "":
            if editorResultFinal['编辑'][i]=="104本地内容整体":
                editorResultFinal['位置'][i]="整体"
            else:
                editorResultFinal['位置'][i]="非当天值班"
        else:
            editorResultFinal['位置'][i]=editorResultFinal['位置'][i]
        
    order = ['整体','104+监控热点新闻-早班','104+监控热点新闻-下午班','非当天值班']
    order_map = dict(zip(order,range(len(order))))
    editorResultFinal['order'] = editorResultFinal['位置'].map(order_map)
    editorResultFinal = editorResultFinal.sort_values(by=['order'],ascending=True)
    editorResultFinal = editorResultFinal.drop(['order'],axis=1)
    editorResultFinal = editorResultFinal.reset_index(drop=True)
   
    contentDetail = content[['内容ID','标题','曝光量','曝光点击量','曝光点击率','次均浏览时长(S)','次均浏览进度','内容调性','是否推大事件','入池人','入池时间','内容类型','一级分类','二级分类']]
    
    #writer = pd.ExcelWriter(str(yesterday)+"-104本地内容运营数据.xlsx")
    writer = pd.ExcelWriter(str(yesterday)+"-104-本地内容运营数据.xlsx")
    editorResultFinal.to_excel(excel_writer=writer,index=0)
    contentDetail.to_excel(excel_writer=writer,startrow = editorResultFinal.shape[0]+5,index = 0)
    # contentdataSum.to_excel(excel_writer=writer,sheet_name='1')
    #writer.save()
    writer.close()
    print("导出成功！")
    
    
    

    
    
   